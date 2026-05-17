import { useMemo } from "react";
import type { Release } from "@/lib/nostr";

type Props = {
  releases: Release[];
};

export default function StatsSummary({ releases }: Props) {
  const stats = useMemo(() => {
    const by = (cat: string) =>
      releases.filter((r) => r.category === cat).length;
    return {
      total: releases.length,
      album: by("album"),
      ep: by("ep"),
      single: by("single"),
      misc: by("miscellaneous"),
    };
  }, [releases]);

  if (stats.total === 0) return null;

  return (
    <div className="hidden sm:flex sm:flex-col sm:justify-center shrink-0 min-w-[160px] font-mono text-[14px] leading-snug rounded-lg border border-transparent px-3 py-2">
      <Row label="total" n={stats.total} accent />
      <div className="mt-1 pt-1 border-t border-[hsl(208_100%_50%)]">
        <Row label="albums" n={stats.album} />
        <Row label="eps" n={stats.ep} />
        <Row label="singles" n={stats.single} />
        {stats.misc > 0 && <Row label="misc" n={stats.misc} />}
      </div>
    </div>
  );
}

function Row({
  label,
  n,
  accent,
}: {
  label: string;
  n: number;
  accent?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className={accent ? "text-accent/80" : "text-muted-foreground/75"}>
        {label}
      </span>
      <span
        className={`tabular-nums ${
          accent ? "text-accent" : "text-muted-foreground/80"
        }`}
      >
        {n.toLocaleString()}
      </span>
    </div>
  );
}
