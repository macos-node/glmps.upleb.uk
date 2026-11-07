/**
 * release.v2 genre slug constants + helpers.
 *
 * Source of truth: schema/release.v2.json — keep this file in sync with the
 * grouped `genreSlugs` (electronicDance / otherGenres / combining). The
 * grouping is semantic + palette ONLY — not a hierarchy; all 74 active slugs
 * are pure peers. Validation matches the schema's strict-but-recoverable
 * posture: unknown slugs are dropped silently, never thrown.
 *
 * The four original compound slash-pairs were retired in the 2026-06
 * restructure (split/collapsed into atomic slugs). They live on in
 * GENRE_DEPRECATED: never emitted on new events, but still VALID for reading
 * legacy events and cross-relay copies, where they render with a slash (see
 * genreLabel).
 */

// Electronic/dance genres — vivid hues.
export const GENRE_ELECTRONIC_DANCE = [
  "ambient",
  "bass",
  "bleep",
  "breaks",
  "dnb",
  "downtempo",
  "electro",
  "electronic",
  "footwork",
  "garage",
  "glitch",
  "grime",
  "house",
  "jungle",
  "techno",
  "trance",
  "trap",
  "trip-hop",
] as const;

// Every other genre — muted, earthy hues.
export const GENRE_OTHER = [
  "alternative",
  "blues",
  "bossa-nova",
  "celtic",
  "choral",
  "classical",
  "country",
  "dancehall",
  "disco",
  "drone",
  "easy-listening",
  "experimental",
  "folk",
  "funk",
  "gospel",
  "gothic",
  "grunge",
  "hip-hop",
  "industrial",
  "jazz",
  "krautrock",
  "latin",
  "library",
  "metal",
  "noise",
  "pop",
  "punk",
  "reggae",
  "rnb",
  "rock",
  "ska",
  "soul",
  "soundtrack",
  "spoken",
  "swing",
] as const;

// Combining forms — modifiers that mean the same on any genre and compose by
// stacking (`dub` + `techno` = dub techno, `post` + `punk` = post-punk).
export const GENRE_COMBINING = [
  "abstract",
  "acid",
  "acoustic",
  "afro",
  "boom-bap",
  "conscious",
  "contemporary",
  "dub",
  "hardcore",
  "indian",
  "instrumental",
  "italo",
  "lo-fi",
  "minimal",
  "post",
  "proto",
  "psychedelic",
  "roots",
  "synth",
  "turntablism",
  "world",
] as const;

// Retired slugs — never emitted; valid for legacy reads only. The four compound
// slash-pairs (display with a slash) plus the 2026-06b 1:1 renames poetry and
// spiritual (display verbatim; remapped to spoken / conscious).
export const GENRE_DEPRECATED = [
  "classical-folk",
  "dnb-jungle",
  "drone-noise",
  "footwork-trap",
  "poetry",
  "spiritual",
] as const;

// Genre slots per release — release.v2 `genreInvariants.slotCap` (3 → 5 in
// the 2026-11 round). First slot = highest priority.
export const GENRE_SLOT_CAP = 5;

// Picker / display order: electronic/dance → other genres → combining forms.
export const GENRE_ORDER = [
  ...GENRE_ELECTRONIC_DANCE,
  ...GENRE_OTHER,
  ...GENRE_COMBINING,
] as const;

export type GenreSlug =
  | (typeof GENRE_ORDER)[number]
  | (typeof GENRE_DEPRECATED)[number];

// Readable set = active (emittable) + deprecated (legacy-only).
const KNOWN: ReadonlySet<string> = new Set<string>([
  ...GENRE_ORDER,
  ...GENRE_DEPRECATED,
]);

export function isGenreSlug(s: string): s is GenreSlug {
  return KNOWN.has(s);
}

/**
 * Wire-to-display rule for human-facing UI.
 *
 * 1. Per-slug overrides: the wire keeps the schema-canonical slug; only the
 *    displayed label changes. `soundtrack` reads as "film" (glmps-side
 *    cosmetic — doesn't affect filter matching) and `rnb` reads as "R&B".
 * 2. Legacy slash-display: the retired compound pairs render with a slash
 *    (`classical-folk` → `classical/folk`, etc.) when encountered in legacy
 *    events. Set-gated, not a blind regex, so atomic hyphen slugs like
 *    `hip-hop`, `lo-fi`, and `boom-bap` render verbatim.
 * 3. Everything else passes through unchanged.
 */
const DISPLAY_OVERRIDES: Record<string, string> = {
  soundtrack: "film",
  rnb: "R&B",
};

const LEGACY_SLASH = new Set<string>([
  "classical-folk",
  "dnb-jungle",
  "drone-noise",
  "footwork-trap",
]);

export function genreLabel(slug: string): string {
  const override = DISPLAY_OVERRIDES[slug];
  if (override) return override;
  return LEGACY_SLASH.has(slug) ? slug.replace(/-/g, "/") : slug;
}

/**
 * Apply release.v2 §"Slot semantics + invariants" on read. Strict-but-
 * recoverable — unknown slugs dropped, duplicates collapsed to first
 * occurrence, capped at GENRE_SLOT_CAP (5) slots, slot order preserved.
 *
 * All slugs are pure peers — no parent/sub gating. Deprecated compound pairs
 * still parse (they're in KNOWN) so legacy events keep their genres.
 */
export function normaliseGenres(raw: readonly string[]): GenreSlug[] {
  const out: GenreSlug[] = [];
  const seen = new Set<string>();
  for (const s of raw) {
    if (out.length >= GENRE_SLOT_CAP) break;
    if (!isGenreSlug(s)) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}
