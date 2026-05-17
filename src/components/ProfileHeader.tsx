import type { ReactNode } from "react";
import type { Profile } from "@/lib/nostr";
import { useIsOwner } from "@/hooks/useIsOwner";
import { useNostrLogin } from "@/hooks/useNostrLogin";

type Props = {
  profile: Profile | null;
  npub: string;
  right?: ReactNode;
};

export default function ProfileHeader({ profile, npub, right }: Props) {
  const name = profile?.display_name || profile?.name || "—";
  const npubShort = `${npub.slice(0, 12)}…${npub.slice(-6)}`;
  const isOwner = useIsOwner();
  const { pubkey } = useNostrLogin();
  const isGuest = !!pubkey && !isOwner;

  return (
    <header className="flex items-stretch gap-4 mb-10">
      {/* Transparent wrapper — groups avatar + text as a single flex child so
          items-stretch height-matches it to the stats box, and items-center
          vertically centers the profile content within that height. */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
      <div
        className="h-[85%] aspect-square shrink-0 rounded-lg bg-muted ring-1 ring-border overflow-hidden bg-cover bg-center"
        style={
          profile?.picture
            ? { backgroundImage: `url(${JSON.stringify(profile.picture)})` }
            : undefined
        }
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <h1 className="text-xl sm:text-2xl font-semibold leading-tight flex flex-wrap items-baseline gap-2">
          <span
            style={{
              backgroundImage: "linear-gradient(90deg, #FF7849, #FFB347)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {name}
          </span>
          <span className="text-muted-foreground/70 text-sm font-normal">
            discography
          </span>
          {isOwner && (
            <span
              title="You're signed in as the owner of this discography"
              className="text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 border border-accent/40 text-accent rounded"
            >
              owner
            </span>
          )}
          {isGuest && (
            <span
              title="You're signed in — you can react to releases"
              className="text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 border border-muted-foreground/30 text-muted-foreground/70 rounded"
            >
              guest · can react
            </span>
          )}
        </h1>
        {profile?.nip05 && (
          <div className="text-[11px] sm:text-xs text-accent/80 mt-1 truncate">
            {profile.nip05}
          </div>
        )}
        <div className="text-[10px] sm:text-[11px] text-muted-foreground/60 mt-1 truncate">
          {npubShort}
        </div>
        {profile?.about && (
          <p className="text-xs sm:text-sm text-muted-foreground mt-3 max-w-prose whitespace-pre-wrap">
            {profile.about}
          </p>
        )}
        {isOwner && (
          <div className="mt-4 text-[11px] font-mono text-muted-foreground/70 border-l-2 border-accent/40 pl-3 py-1">
            owner view — read-only viewer; publish via your{" "}
            <span className="text-accent/80">ndisc</span> tool.
          </div>
        )}
      </div>
      </div>
      {right}
    </header>
  );
}
