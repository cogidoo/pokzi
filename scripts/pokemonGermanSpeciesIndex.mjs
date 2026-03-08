#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const POKEAPI_SPECIES_NAMES_CSV_URL =
  'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species_names.csv';
const GERMAN_LANGUAGE_ID = '6';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TARGET_FILE = path.resolve(__dirname, '../src/data/pokemonGermanSpeciesIndex.ts');

/**
 * Parses CSV text into rows while handling quoted fields and escaped quotes.
 *
 * @param {string} csvText - Raw CSV payload.
 * @returns {string[][]} Parsed rows including header.
 */
function parseCsv(csvText) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const current = csvText[index];
    const next = csvText[index + 1];

    if (current === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (current === ',' && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }

    if ((current === '\n' || current === '\r') && !inQuotes) {
      if (current === '\r' && next === '\n') {
        index += 1;
      }

      row.push(field);
      const isSingleEmptyRow = row.length === 1 && row[0] === '';
      if (!isSingleEmptyRow) {
        rows.push(row);
      }
      row = [];
      field = '';
      continue;
    }

    field += current;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    const isSingleEmptyRow = row.length === 1 && row[0] === '';
    if (!isSingleEmptyRow) {
      rows.push(row);
    }
  }

  return rows;
}

/**
 * Escapes a string for a single-quoted TypeScript object literal value.
 *
 * @param {string} value - Raw localized name.
 * @returns {string} Escaped value safe for single-quoted output.
 */
function escapeSingleQuotedString(value) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Extracts German species names (`local_language_id = 6`) keyed by species id.
 *
 * @param {string} csvText - Raw CSV payload from the upstream PokeAPI dataset.
 * @returns {Array<[number, string]>} Sorted species id/name tuples.
 */
export function buildGermanSpeciesEntriesFromCsv(csvText) {
  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    throw new Error('CSV payload is empty.');
  }

  const [header, ...bodyRows] = rows;
  const speciesIdIndex = header.indexOf('pokemon_species_id');
  const languageIdIndex = header.indexOf('local_language_id');
  const nameIndex = header.indexOf('name');

  if (speciesIdIndex === -1 || languageIdIndex === -1 || nameIndex === -1) {
    throw new Error('CSV payload is missing required columns.');
  }

  const byId = new Map();

  for (const row of bodyRows) {
    const languageId = row[languageIdIndex];
    if (languageId !== GERMAN_LANGUAGE_ID) {
      continue;
    }

    const rawSpeciesId = row[speciesIdIndex];
    const speciesId = Number(rawSpeciesId);
    if (!Number.isInteger(speciesId) || speciesId <= 0) {
      continue;
    }

    const germanName = row[nameIndex];
    if (!germanName) {
      continue;
    }

    byId.set(speciesId, germanName);
  }

  return Array.from(byId.entries()).sort((left, right) => left[0] - right[0]);
}

/**
 * Renders the generated TypeScript module for the static German name index.
 *
 * @param {Array<[number, string]>} entries - Sorted species id/name tuples.
 * @returns {string} TypeScript module content.
 */
export function renderGermanSpeciesIndexModule(entries) {
  const rows = entries
    .map(
      ([speciesId, germanName]) =>
        `  ${String(speciesId)}: '${escapeSingleQuotedString(germanName)}',`,
    )
    .join('\n');

  return [
    '/**',
    ' * Static German species-name index sourced from the official PokeAPI dataset.',
    ` * Generated from ${POKEAPI_SPECIES_NAMES_CSV_URL}`,
    ' */',
    'export const GERMAN_SPECIES_NAME_BY_ID: Readonly<Record<number, string>> = {',
    rows,
    '};',
    '',
  ].join('\n');
}

/**
 * Fetches the latest upstream CSV dataset used for the generated index.
 *
 * @returns {Promise<string>} Raw CSV content.
 */
async function fetchPokemonSpeciesNamesCsv() {
  const response = await fetch(POKEAPI_SPECIES_NAMES_CSV_URL);
  if (!response.ok) {
    throw new Error(`Failed to download species-name CSV: HTTP ${String(response.status)}`);
  }

  return response.text();
}

/**
 * Reads the currently committed German index module from disk.
 *
 * @returns {Promise<string>} Existing module content.
 */
async function readCurrentIndexModule() {
  return readFile(TARGET_FILE, 'utf8');
}

/**
 * Normalizes line endings for deterministic content comparisons.
 *
 * @param {string} value - Input text.
 * @returns {string} Text normalized to Unix newlines.
 */
function normalizeLineEndings(value) {
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Builds a fresh index module based on the latest upstream CSV payload.
 *
 * @returns {Promise<string>} Generated TypeScript module content.
 */
async function generateLatestIndexModule() {
  const csvText = await fetchPokemonSpeciesNamesCsv();
  const entries = buildGermanSpeciesEntriesFromCsv(csvText);
  return renderGermanSpeciesIndexModule(entries);
}

/**
 * Runs the drift check against the committed index file.
 *
 * @returns {Promise<void>} Resolves when files are in sync.
 */
async function checkIndexDrift() {
  const [currentModule, nextModule] = await Promise.all([
    readCurrentIndexModule(),
    generateLatestIndexModule(),
  ]);

  if (normalizeLineEndings(currentModule) === normalizeLineEndings(nextModule)) {
    console.log('DE index check passed: committed index is up to date.');
    return;
  }

  throw new Error(
    'DE index drift detected. Run "npm run index:de:update" and commit the updated index file.',
  );
}

/**
 * Regenerates and writes the committed German index module.
 *
 * @returns {Promise<void>} Resolves when file write is complete.
 */
async function updateIndexFile() {
  const nextModule = await generateLatestIndexModule();
  const currentModule = await readCurrentIndexModule();

  if (normalizeLineEndings(currentModule) === normalizeLineEndings(nextModule)) {
    console.log('DE index update skipped: committed index is already up to date.');
    return;
  }

  await writeFile(TARGET_FILE, nextModule, 'utf8');
  console.log(`DE index updated: ${TARGET_FILE}`);
}

/**
 * Entry point for the CLI script.
 *
 * @returns {Promise<void>} Resolves on success.
 */
async function main() {
  const mode = process.argv[2];

  if (mode === 'check') {
    await checkIndexDrift();
    return;
  }

  if (mode === 'update') {
    await updateIndexFile();
    return;
  }

  throw new Error('Usage: node scripts/pokemonGermanSpeciesIndex.mjs <check|update>');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
