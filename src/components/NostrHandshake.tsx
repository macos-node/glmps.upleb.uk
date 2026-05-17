import { useEffect, useMemo, useState } from "react";
import { nip19 } from "nostr-tools";
import { useNostrLogin } from "@/hooks/useNostrLogin";
import { useProfile } from "@/hooks/useProfile";

// Coral-amber handshake glyph in the page header. Shown only when the
// logged-in user has a NIP-05 identifier (name@domain like admin@fizx.uk)
// AND that identifier verifies — i.e. the well-known nostr.json at that
// domain maps the name back to the user's pubkey. Two conditions, both
// observable; the icon turns into a verifiable claim about identity rather
// than a generic "logged in" marker.
//
// SVG: lucide-react Handshake (apache-2). Inlined to avoid the dep.

// Module-level cache: pubkey → verified? Avoids re-fetching for the same
// identity within a session.
const VERIFIED: Map<string, boolean> = new Map();

async function verifyNip05(nip05: string, pubkey: string): Promise<boolean> {
  const at = nip05.indexOf("@");
  if (at <= 0) return false;
  const name = nip05.slice(0, at).toLowerCase();
  const domain = nip05.slice(at + 1);
  const url = `https://${domain}/.well-known/nostr.json?name=${encodeURIComponent(name)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return false;
    const json = await res.json();
    const claimed = json?.names?.[name];
    return typeof claimed === "string" && claimed.toLowerCase() === pubkey.toLowerCase();
  } catch {
    return false;
  }
}

export default function NostrHandshake() {
  const { pubkey } = useNostrLogin();
  const profile = useProfile(pubkey ?? undefined);
  const nip05 = profile?.nip05;
  const [verified, setVerified] = useState<boolean>(() =>
    pubkey && nip05 ? VERIFIED.get(pubkey) === true : false,
  );

  useEffect(() => {
    if (!pubkey || !nip05) {
      setVerified(false);
      return;
    }
    const cached = VERIFIED.get(pubkey);
    if (cached !== undefined) {
      setVerified(cached);
      return;
    }
    let cancelled = false;
    void verifyNip05(nip05, pubkey).then((ok) => {
      VERIFIED.set(pubkey, ok);
      if (!cancelled) setVerified(ok);
    });
    return () => { cancelled = true; };
  }, [pubkey, nip05]);

  const njumpUrl = useMemo(
    () => (pubkey ? `https://njump.me/${nip19.npubEncode(pubkey)}` : "#"),
    [pubkey],
  );

  if (!pubkey || !nip05 || !verified) return null;

  return (
    <a
      href={njumpUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={`Verified Nostr identity — ${nip05}`}
      aria-label={`Verified NIP-05 identity ${nip05}`}
      className="shrink-0 text-accent/80 hover:text-accent transition-colors"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-8 h-8 sm:w-10 sm:h-10"
      >
        <path d="m11 17 2 2a1 1 0 1 0 3-3" />
        <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" />
        <path d="m21 3 1 11h-2" />
        <path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" />
        <path d="M3 4h8" />
      </svg>
    </a>
  );
}
