#!/usr/bin/env node
// Probes the configured relays for the owner npub's kind:31237 releases and
// kind:5 deletes, dedupes by d-tag (NIP-01 replaceable), and emits a diff vs
// the previously-saved state file.
//
// Used by the Claude-driven discography tracker. Safe to run manually:
//   node scripts/track.mjs

import { SimplePool, nip19 } from "nostr-tools";
import { useWebSocketImplementation } from "nostr-tools/relay";
import WebSocket from "ws";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

useWebSocketImplementation(WebSocket);

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const STATE_FILE = path.join(ROOT, ".tracker-state.json");

const CONFIG = readConfig();
const HEX = nip19.decode(CONFIG.OWNER_NPUB).data;
const RELAYS = CONFIG.DEFAULT_RELAYS;
const RELEASE_KIND = CONFIG.RELEASE_KIND;

function readConfig() {
  // Parse a few exported constants from src/config.ts without importing TS.
  const src = fs.readFileSync(path.join(ROOT, "src/config.ts"), "utf8");
  const grab = (name) => {
    const m = src.match(new RegExp(`${name}\\s*=\\s*([^;]+);`, "s"));
    if (!m) throw new Error(`config: ${name} not found`);
    const expr = m[1].replace(/\s+as\s+const\b/g, "");
    // eslint-disable-next-line no-new-func
    return new Function(`return ${expr}`)();
  };
  return {
    OWNER_NPUB: grab("OWNER_NPUB"),
    DEFAULT_RELAYS: grab("DEFAULT_RELAYS"),
    RELEASE_KIND: grab("RELEASE_KIND"),
  };
}

function loadState() {
  if (!fs.existsSync(STATE_FILE)) return { firstRun: true, releases: {}, deletedIds: [] };
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return { firstRun: true, releases: {}, deletedIds: [] };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function getTag(ev, name) {
  return ev.tags.find((t) => t[0] === name)?.[1];
}

function summarize(ev) {
  return {
    id: ev.id,
    created_at: ev.created_at,
    d: getTag(ev, "d"),
    title: getTag(ev, "title"),
    artist: getTag(ev, "artist"),
    medium: getTag(ev, "medium"),
    format: getTag(ev, "format") ?? null,
    year: getTag(ev, "year") ?? null,
    type: getTag(ev, "type") ?? null,
    category: getTag(ev, "category") ?? null,
    tags: ev.tags.filter((t) => t[0] === "t").map((t) => t[1]),
  };
}

async function probe() {
  const pool = new SimplePool();
  const releases = await pool.querySync(
    RELAYS,
    { kinds: [RELEASE_KIND], authors: [HEX] },
    { maxWait: 5000 },
  );
  const deletes = await pool.querySync(
    RELAYS,
    { kinds: [5], authors: [HEX] },
    { maxWait: 5000 },
  );
  pool.close(RELAYS);

  // Dedupe replaceable: newest created_at per d-tag; lower id wins ties.
  const latestByD = new Map();
  for (const ev of releases) {
    const d = getTag(ev, "d");
    if (!d) continue;
    const cur = latestByD.get(d);
    if (
      !cur ||
      ev.created_at > cur.created_at ||
      (ev.created_at === cur.created_at && ev.id < cur.id)
    ) {
      latestByD.set(d, ev);
    }
  }

  // NIP-09: e-tag = specific event id; a-tag = coordinate kind:pubkey:d.
  // ndisc treats a-tags as permanent tombstones — match without timestamp gate.
  const deletedIds = new Set();
  const deletedAddrs = new Set();
  for (const ev of deletes) {
    for (const t of ev.tags) {
      if (t[0] === "e" && t[1]) deletedIds.add(t[1]);
      else if (t[0] === "a" && t[1]) deletedAddrs.add(t[1]);
    }
  }

  const current = {};
  for (const [d, ev] of latestByD) {
    if (deletedIds.has(ev.id)) continue;
    if (deletedAddrs.has(`${ev.kind}:${ev.pubkey}:${d}`)) continue;
    current[d] = summarize(ev);
  }
  return { current, deletedIds: [...deletedIds], deletedAddrs: [...deletedAddrs] };
}

function diff(prev, curr) {
  const added = [];
  const updated = [];
  const removed = [];
  for (const d of Object.keys(curr)) {
    if (!prev[d]) added.push(curr[d]);
    else if (prev[d].id !== curr[d].id) updated.push({ before: prev[d], after: curr[d] });
  }
  for (const d of Object.keys(prev)) {
    if (!curr[d]) removed.push(prev[d]);
  }
  return { added, updated, removed };
}

function fmtRow(r) {
  const facets = [r.year, r.medium, r.format].filter(Boolean).join(" · ");
  const tagStr = r.tags?.length ? ` [${r.tags.join(", ")}]` : "";
  return `  · ${r.d} — ${r.artist} – ${r.title}${facets ? `  (${facets})` : ""}${tagStr}`;
}

(async () => {
  const prev = loadState();
  const { current, deletedIds } = await probe();
  const total = Object.keys(current).length;
  const ts = new Date().toISOString();

  if (prev.firstRun) {
    console.log(`[${ts}] baseline established — ${total} release${total === 1 ? "" : "s"} on relays`);
    Object.values(current).forEach((r) => console.log(fmtRow(r)));
  } else {
    const { added, updated, removed } = diff(prev.releases, current);
    const changed = added.length + updated.length + removed.length;
    if (changed === 0) {
      console.log(`[${ts}] no changes — ${total} release${total === 1 ? "" : "s"} total`);
    } else {
      console.log(`[${ts}] ${added.length} added · ${updated.length} updated · ${removed.length} removed · ${total} total`);
      if (added.length) {
        console.log("ADDED:");
        added.forEach((r) => console.log(fmtRow(r)));
      }
      if (updated.length) {
        console.log("UPDATED:");
        updated.forEach((u) => {
          console.log(fmtRow(u.after));
          const fields = ["title", "artist", "medium", "format", "year"];
          const changes = fields.filter((f) => u.before[f] !== u.after[f]);
          if (changes.length) {
            changes.forEach((f) =>
              console.log(`     ${f}: "${u.before[f] ?? ""}" → "${u.after[f] ?? ""}"`),
            );
          }
        });
      }
      if (removed.length) {
        console.log("REMOVED:");
        removed.forEach((r) => console.log(fmtRow(r)));
      }
    }
  }

  saveState({ firstRun: false, lastCheckedAt: ts, releases: current, deletedIds });
  process.exit(0);
})();
