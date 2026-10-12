#!/usr/bin/env node
// Search the logo archive. Node 18+, no dependencies.
//   node search.mjs <terms...> [--country X] [--volume X] [--from YEAR] [--to YEAR]
//                   [--limit N] [--download DIR] [--json]
// Every term must match one of: firm, business, designer, agency, address,
// motif category, country, year, number. Data comes from the live site
// (LOGO_ARCHIVE_URL overrides it, e.g. for a local preview) and is cached
// for a day in the temp dir.

import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SITE = (process.env.LOGO_ARCHIVE_URL || 'https://logos.micr.dev').replace(/\/$/, '');
const CACHE = join(tmpdir(), 'logo-archive-cache.json');
const DAY = 24 * 60 * 60 * 1000;
const REQUEST_HEADERS = { 'User-Agent': 'OpenAI File Downloader, XaiImageApiFetch/1.0' };

function parseArgs(argv) {
  const opts = { terms: [], limit: 20 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') opts.json = true;
    else if (a.startsWith('--')) opts[a.slice(2)] = argv[++i];
    else opts.terms.push(a.toLowerCase());
  }
  opts.limit = Number(opts.limit) || 20;
  return opts;
}

async function getJson(url) {
  const res = await fetch(url, { headers: REQUEST_HEADERS });
  if (!res.ok) throw new Error(`${res.status} fetching ${url}`);
  return res.json();
}

// All entries with an image, across every volume listed in the site manifest
async function loadArchive() {
  try {
    if (Date.now() - (await stat(CACHE)).mtimeMs < DAY) {
      const cached = JSON.parse(await readFile(CACHE, 'utf8'));
      if (cached.site === SITE) return cached.entries;
    }
  } catch { /* no cache yet */ }
  const manifest = await getJson(`${SITE}/assets/manifest.json?schema=2`);
  const imageHashes = new Map(manifest.marks.map(([src, , , hash]) => [src, hash]));
  const volumes = [...new Set(manifest.marks.map(([src]) => src.split('/')[0]))];
  const entries = (await Promise.all(volumes.map(async vol =>
    (await getJson(`${SITE}/${vol}/catalog.json`))
      .filter(e => e.image)
      .map(e => {
        const src = `${vol}/${e.image}`;
        return { ...e, vol,
          url: `${SITE}/assets/marks/${src.replace(/\.png$/, '.webp')}?v=${imageHashes.get(src)}` };
      })
  ))).flat();
  await writeFile(CACHE, JSON.stringify({ site: SITE, entries }));
  return entries;
}

const opts = parseArgs(process.argv.slice(2));
const entries = await loadArchive();
const hits = entries.filter(e => {
  const year = Number(e.year) || 0;
  if (opts.country && !(e.country || '').toLowerCase().includes(opts.country.toLowerCase())) return false;
  if (opts.volume && !`${e.vol} ${e.volume}`.toLowerCase().includes(opts.volume.toLowerCase())) return false;
  if (opts.from && year < Number(opts.from)) return false;
  if (opts.to && (!year || year > Number(opts.to))) return false;
  const text = [e.firm, e.act, e.des, e.ag, e.add, e.category, e.country, e.year, e.num]
    .filter(Boolean).join(' ').toLowerCase();
  return opts.terms.every(t => text.includes(t));
}).slice(0, opts.limit);

if (opts.download) {
  await mkdir(opts.download, { recursive: true });
  await Promise.all(hits.map(async e => {
    const res = await fetch(e.url, { headers: REQUEST_HEADERS });
    if (!res.ok) return;
    // Numbers restart per country within a volume, so the country is part of the name
    e.file = join(opts.download, `${e.vol}-${e.country || 'x'}-${e.num}.webp`.replace(/[^\w.\/-]+/g, '_'));
    await writeFile(e.file, Buffer.from(await res.arrayBuffer()));
  }));
}

if (opts.json) {
  console.log(JSON.stringify(hits, null, 2));
} else {
  if (!hits.length) console.log('No matches. Try fewer or broader terms.');
  for (const e of hits) {
    const credit = [e.act, e.des && `des. ${e.des}`, [e.country, e.year].filter(Boolean).join(' '), e.category && `motif: ${e.category}`]
      .filter(Boolean).join(' | ');
    console.log(`#${e.num} ${e.firm || '(unnamed)'} — ${credit}\n   ${e.file || e.url}`);
  }
  console.log(`\n${hits.length} shown (limit ${opts.limit}). Browse visually: ${SITE}`);
}
