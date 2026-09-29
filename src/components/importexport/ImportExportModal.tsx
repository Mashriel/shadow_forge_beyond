import React, { useState } from 'react';
import { exportAllUserData, importAllUserData } from '../../services/db';
import { Card, Deck } from '../../types/card';
import { playClick, playCardPlay } from '../../services/sound';
import {
  parseAndValidateBackupJSON,
  ValidatedBackupManifest,
  MAX_BACKUP_FILE_SIZE,
} from '../../services/backupSecurity';
import {
  X,
  Download,
  Upload,
  Copy,
  Check,
  FileJson,
  AlertTriangle,
  ShieldCheck,
  Info,
  Database,
  RefreshCw,
} from 'lucide-react';

interface ImportExportModalProps {
  onClose: () => void;
  onRefreshData: () => void;
  cardsMap: Map<string, Card>;
  onImportSingleDeck: (deck: Deck) => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  onClose,
  onRefreshData,
  cardsMap,
  onImportSingleDeck,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [copiedAll, setCopiedAll] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // Validation Preview State
  const [pendingManifest, setPendingManifest] = useState<ValidatedBackupManifest | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');
  const [isProcessing, setIsProcessing] = useState(false);

  // Export full backup
  const handleExportJson = async () => {
    playClick();
    const data = await exportAllUserData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shadowverse_wb_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy full backup to clipboard
  const handleCopyJson = async () => {
    playClick();
    const data = await exportAllUserData();
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_BACKUP_FILE_SIZE) {
      setImportError(`File size exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setImportJsonText(text);
      setImportError(null);
    };
    reader.readAsText(file);
  };

  // Analyze & Validate Backup File for Preview
  const handleAnalyzeBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);
    setImportSuccess(null);

    if (!importJsonText.trim()) {
      setImportError('Please paste JSON or upload a backup file.');
      return;
    }

    try {
      setIsProcessing(true);
      const manifest = await parseAndValidateBackupJSON(importJsonText, cardsMap);
      setPendingManifest(manifest);
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : 'Invalid JSON file structure.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirm and Execute Import
  const handleExecuteImport = async () => {
    if (!pendingManifest) return;

    try {
      setIsProcessing(true);
      playCardPlay();

      // If single deck imported via preview
      if (pendingManifest.stats.deckCount === 1 && pendingManifest.stats.collectionCount === 0 && pendingManifest.stats.craftPlanCount === 0) {
        const singleDeck = pendingManifest.decks[0];
        if (singleDeck) {
          onImportSingleDeck(singleDeck);
          setImportSuccess(`Successfully imported deck "${singleDeck.name}"!`);
        }
      } else {
        // Full backup restore
        await importAllUserData(
          {
            decks: pendingManifest.decks,
            collection: pendingManifest.collection,
            craftPlans: pendingManifest.craftPlans,
          },
          importMode
        );
        setImportSuccess(
          `Successfully ${importMode === 'overwrite' ? 'restored and replaced' : 'merged'} ${pendingManifest.stats.deckCount} decks, ${pendingManifest.stats.collectionCount} collection items, and ${pendingManifest.stats.craftPlanCount} craft plans!`
        );
      }

      onRefreshData();
      setPendingManifest(null);
      setTimeout(() => onClose(), 1500);
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : 'Failed to apply backup to local database.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div
        className="relative w-full max-w-xl rounded-2xl border border-cyan-800/50 bg-slate-950 p-6 text-slate-100 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 border border-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-white flex items-center space-x-2">
            <ShieldCheck className="h-6 w-6 text-cyan-400" />
            <span>Data Backup & Restore Portal</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Safely backup and restore your decks, collection, and craft plans across devices.
          </p>
        </div>

        {/* Static Repository & Storage Read-Only Security Notice */}
        <div className="flex items-start space-x-3 rounded-xl border border-cyan-900/40 bg-cyan-950/20 p-3 text-xs text-cyan-200">
          <Info className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px]">
            <strong>Public & Static Deployment Notice:</strong> Source code files in the public repository remain static and read-only. All your personal deck lists and collection edits are stored exclusively in your browser's private local storage. Use the backup archive file below to save or load your changes anytime.
          </p>
        </div>

        {/* Tab selection */}
        <div className="flex rounded-xl border border-slate-800 bg-slate-900 p-1">
          <button
            onClick={() => {
              setActiveTab('export');
              setPendingManifest(null);
            }}
            className={`flex-1 flex items-center justify-center space-x-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
              activeTab === 'export'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Download className="h-4 w-4" />
            <span>Export Backup Archive</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('import');
              setPendingManifest(null);
            }}
            className={`flex-1 flex items-center justify-center space-x-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
              activeTab === 'import'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="h-4 w-4" />
            <span>Import / Restore</span>
          </button>
        </div>

        {/* Tab Content: Export */}
        {activeTab === 'export' && (
          <div className="space-y-4 pt-1">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
              <div className="flex items-center space-x-3">
                <FileJson className="h-8 w-8 text-cyan-400 shrink-0" />
                <div>
                  <h3 className="font-serif font-bold text-white text-sm">
                    Verified JSON Backup File
                  </h3>
                  <p className="text-xs text-slate-400">
                    Exports all your custom decks, full card collection records, foil counts, and queued craft items with an embedded SHA-256 integrity checksum.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={handleExportJson}
                  className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 px-4 py-2 text-xs font-bold text-slate-950 hover:brightness-110 shadow-md transition-all"
                >
                  <Download className="h-4 w-4" />
                  <span>Download .json Backup File</span>
                </button>

                <button
                  onClick={handleCopyJson}
                  className="flex items-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
                >
                  {copiedAll ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  <span>{copiedAll ? 'Copied to Clipboard!' : 'Copy to Clipboard'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Import */}
        {activeTab === 'import' && !pendingManifest && (
          <form onSubmit={handleAnalyzeBackup} className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Paste JSON text or upload backup file (.json):
              </label>
              <textarea
                rows={6}
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder="Paste JSON text or choose a .json backup file..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-slate-300 hover:border-slate-600 transition-colors">
                <Upload className="h-4 w-4 text-cyan-400" />
                <span>Upload .json Backup File</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                type="submit"
                disabled={!importJsonText.trim() || isProcessing}
                className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 px-5 py-2 text-xs font-bold text-slate-950 hover:brightness-110 disabled:opacity-40 shadow-md transition-all"
              >
                {isProcessing && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                <span>Verify & Preview Backup</span>
              </button>
            </div>

            {importError && (
              <div className="flex items-center space-x-2 rounded-xl border border-rose-800 bg-rose-950/40 p-3 text-xs text-rose-300">
                <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {importSuccess && (
              <div className="flex items-center space-x-2 rounded-xl border border-emerald-800 bg-emerald-950/40 p-3 text-xs text-emerald-300">
                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{importSuccess}</span>
              </div>
            )}
          </form>
        )}

        {/* Preview & Validation Report Modal */}
        {pendingManifest && (
          <div className="space-y-4 pt-1 animate-in fade-in duration-200">
            <div className="rounded-xl border border-cyan-500/50 bg-slate-900/90 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="font-serif font-bold text-white text-sm flex items-center space-x-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>Backup Security & Format Report</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(pendingManifest.exportedAt).toLocaleDateString()}
                </span>
              </div>

              {/* Data Summary Grid */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs py-1">
                <div className="rounded-lg bg-slate-950 p-2 border border-slate-800">
                  <span className="block text-slate-400 text-[10px]">Decks</span>
                  <strong className="text-cyan-300 text-sm">{pendingManifest.stats.deckCount}</strong>
                </div>
                <div className="rounded-lg bg-slate-950 p-2 border border-slate-800">
                  <span className="block text-slate-400 text-[10px]">Collection Cards</span>
                  <strong className="text-emerald-300 text-sm">{pendingManifest.stats.collectionCount}</strong>
                </div>
                <div className="rounded-lg bg-slate-950 p-2 border border-slate-800">
                  <span className="block text-slate-400 text-[10px]">Craft Plans</span>
                  <strong className="text-amber-300 text-sm">{pendingManifest.stats.craftPlanCount}</strong>
                </div>
              </div>

              {/* Integrity Warning List */}
              {pendingManifest.warnings.length > 0 && (
                <div className="rounded-lg border border-amber-800/60 bg-amber-950/30 p-2.5 text-[11px] text-amber-200 space-y-1">
                  <span className="font-bold block">Sanitization & Format Adjustments ({pendingManifest.warnings.length}):</span>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-300 max-h-24 overflow-y-auto">
                    {pendingManifest.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Mode Selector */}
              {pendingManifest.stats.deckCount > 0 && (
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    Restoration Mode:
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setImportMode('merge')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        importMode === 'merge'
                          ? 'border-cyan-500 bg-cyan-950/60 text-white shadow-sm'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <strong className="block font-semibold">Merge Data</strong>
                      <span className="text-[10px] opacity-75">Combines backup with current decks</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setImportMode('overwrite')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        importMode === 'overwrite'
                          ? 'border-rose-500 bg-rose-950/60 text-white shadow-sm'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <strong className="block font-semibold text-rose-300">Replace / Overwrite</strong>
                      <span className="text-[10px] opacity-75">Replaces current local database</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setPendingManifest(null)}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={isProcessing}
                  className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-5 py-2 text-xs font-bold text-slate-950 hover:brightness-110 shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all"
                >
                  {isProcessing && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>Confirm & Restore</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
