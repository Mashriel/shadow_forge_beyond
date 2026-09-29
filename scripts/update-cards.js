import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const apiBase = 'https://raw.githubusercontent.com/SomostVE/beyond_codex/main/api/v1';
const dataDirectory = fileURLToPath(new URL('../public/data/', import.meta.url));
const endpoints = ['cards.json', 'metadata.json', 'manifest.json'];

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

async function fetchJson(endpoint) {
  const response = await fetch(`${apiBase}/${endpoint}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Could not fetch ${endpoint}: HTTP ${response.status}`);
  }

  return response.json();
}

async function readLocalJson(endpoint) {
  try {
    return JSON.parse(await readFile(path.join(dataDirectory, endpoint), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw new Error(`Could not read local ${endpoint}: ${error.message}`);
  }
}

function validateSnapshot(cards, metadata, manifest) {
  if (!Array.isArray(cards) || cards.length === 0) {
    throw new Error('cards.json must contain a non-empty array.');
  }

  const cardIds = new Set();
  for (const card of cards) {
    const id = String(card?.id ?? '');
    if (!id || !card.name) {
      throw new Error('cards.json contains a card without an ID or name.');
    }
    if (cardIds.has(id)) {
      throw new Error(`cards.json contains duplicate card ID ${id}.`);
    }
    cardIds.add(id);
  }

  if (!Array.isArray(metadata?.classes) || !metadata?.sets || typeof metadata.sets !== 'object') {
    throw new Error('metadata.json is missing its classes or sets.');
  }

  if (metadata.count !== undefined && metadata.count !== cards.length) {
    throw new Error(`metadata.json reports ${metadata.count} cards, but cards.json contains ${cards.length}.`);
  }

  if (!manifest?.counts || manifest.counts.cards !== cards.length) {
    throw new Error(`manifest.json card count does not match cards.json (${cards.length}).`);
  }

  if (
    metadata.generatedAt &&
    manifest.generatedAt &&
    metadata.generatedAt !== manifest.generatedAt
  ) {
    throw new Error('metadata.json and manifest.json have different generatedAt timestamps.');
  }
}

function summarizeCardChanges(previousCards, nextCards) {
  if (!Array.isArray(previousCards)) {
    return { added: nextCards.length, modified: 0, removed: 0 };
  }

  const previousById = new Map(previousCards.map((card) => [String(card.id), card]));
  const nextById = new Map(nextCards.map((card) => [String(card.id), card]));
  let added = 0;
  let modified = 0;

  for (const [id, card] of nextById) {
    if (!previousById.has(id)) added += 1;
    else if (stableStringify(previousById.get(id)) !== stableStringify(card)) modified += 1;
  }

  const removed = [...previousById.keys()].filter((id) => !nextById.has(id)).length;
  return { added, modified, removed };
}

async function writeJsonAtomically(filePath, value) {
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, filePath);
}

async function main() {
  const [cards, metadata, manifest] = await Promise.all(endpoints.map(fetchJson));
  validateSnapshot(cards, metadata, manifest);

  const localSnapshots = await Promise.all(endpoints.map(readLocalJson));
  const cardChanges = summarizeCardChanges(localSnapshots[0], cards);
  console.log(
    `Cards: ${cards.length} total; ${cardChanges.added} added, ${cardChanges.modified} modified, ${cardChanges.removed} removed.`,
  );

  await mkdir(dataDirectory, { recursive: true });
  for (let index = 0; index < endpoints.length; index += 1) {
    const endpoint = endpoints[index];
    const snapshot = [cards, metadata, manifest][index];
    const changed = stableStringify(localSnapshots[index]) !== stableStringify(snapshot);
    await writeJsonAtomically(path.join(dataDirectory, endpoint), snapshot);
    console.log(`${endpoint}: ${changed ? 'updated' : 'already current'}.`);
  }
}

main().catch((error) => {
  console.error(`Card database update failed: ${error.message}`);
  process.exitCode = 1;
});