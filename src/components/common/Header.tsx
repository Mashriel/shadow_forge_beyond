import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  BookOpen,
  PieChart,
  Sword,
  Wrench,
  Download,
  Volume2,
  VolumeX,
  Menu,
  X,
  Zap,
} from 'lucide-react';
import { isSoundEnabled, setSoundEnabled, playClick } from '../../services/sound';
import { Deck } from '../../types/card';

export type ActiveTab = 'decks' | 'cards' | 'collection' | 'tracker' | 'handtester' | 'craft';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  activeDeck: Deck | null;
  onOpenDeckBuilder: (deck: Deck) => void;
  onOpenImportExport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  activeDeck,
  onOpenDeckBuilder,
  onOpenImportExport,
}) => {
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playClick();
  };

  const handleTab = (tab: ActiveTab) => {
    playClick();
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  const navItems = [
    { id: 'decks' as ActiveTab, label: 'Decks', icon: Layers, badge: activeDeck ? 'Active' : null },
    { id: 'cards' as ActiveTab, label: 'Card Database', icon: BookOpen },
    { id: 'collection' as ActiveTab, label: 'Collection', icon: Sparkles },
    { id: 'tracker' as ActiveTab, label: 'Set Tracker', icon: PieChart },
    { id: 'handtester' as ActiveTab, label: 'Hand Tester', icon: Sword },
    { id: 'craft' as ActiveTab, label: 'Craft Planner', icon: Wrench },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-cyan-900/40 bg-slate-950/90 backdrop-blur-md">
      <div className="w-full flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 xl:px-10">
        {/* Brand */}
        <div
          onClick={() => handleTab('decks')}
          className="group flex cursor-pointer items-center space-x-3 transition-opacity hover:opacity-90"
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-500/40 bg-gradient-to-br from-cyan-950/80 via-slate-900 to-indigo-950/80 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
            <span className="font-serif text-lg font-extrabold tracking-wider text-cyan-300">SF</span>
            <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-cyan-400/20 group-hover:ring-cyan-400/50" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-serif text-sm font-extrabold tracking-wider text-slate-100 uppercase sm:text-base">
                SHADOWFORGE
              </span>
              <span className="rounded bg-cyan-950/80 px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-cyan-400 uppercase ring-1 ring-cyan-500/30">
                BEYOND
              </span>
            </div>
            <div className="text-[11px] text-slate-400">Deckbuilder • Collection • Craft Planner</div>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTab(item.id)}
                className={`relative flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? 'border border-cyan-500/40 bg-cyan-950/50 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                    : 'text-slate-300 hover:border-slate-800 hover:bg-slate-900/60 hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)] animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Action Tools */}
        <div className="flex items-center space-x-2">
          {/* Quick jump to active deck if on another tab */}
          {activeDeck && activeTab !== 'decks' && (
            <button
              onClick={() => {
                playClick();
                onOpenDeckBuilder(activeDeck);
              }}
              title={`Return to editing ${activeDeck.name}`}
              className="hidden sm:flex items-center space-x-1.5 rounded border border-amber-500/40 bg-amber-950/40 px-2.5 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-900/50 transition-colors shadow-[0_0_8px_rgba(245,158,11,0.2)]"
            >
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span className="max-w-[120px] truncate">{activeDeck.name}</span>
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            title={soundOn ? 'Sound Effects Enabled' : 'Sound Effects Muted'}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/70 text-slate-400 hover:border-slate-700 hover:text-cyan-300 transition-colors"
          >
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-slate-600" />}
          </button>

          {/* Import / Export */}
          <button
            onClick={() => {
              playClick();
              onOpenImportExport();
            }}
            title="Import / Export Data"
            className="flex h-9 items-center space-x-1.5 rounded-lg border border-cyan-800/40 bg-cyan-950/40 px-3 text-xs font-medium text-cyan-300 hover:bg-cyan-900/50 hover:border-cyan-700/60 transition-colors"
          >
            <Download className="h-4 w-4 text-cyan-400" />
            <span className="hidden sm:inline">Backup</span>
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex lg:hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-slate-800 bg-slate-950/95 px-4 pt-2 pb-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTab(item.id)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium ${
                  isActive
                    ? 'border border-cyan-500/40 bg-cyan-950/60 text-cyan-300'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="rounded bg-cyan-900/60 px-1.5 py-0.5 text-[10px] text-cyan-300">
                    Active
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
