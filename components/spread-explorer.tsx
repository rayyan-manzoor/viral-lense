"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Globe2,
  Layers,
  Pause,
  Play,
  RotateCcw,
  SkipForward
} from "lucide-react";
import { SpreadMap } from "@/components/spread-map";
import type { ColorMode } from "@/components/spread-globe-client";
import {
  CaseInputPanel,
  type NewCategoryMeta
} from "@/components/case-input-panel";
import { sampleDatasets } from "@/lib/sample-spread-data";
import type { CaseEntry, SpreadDataset } from "@/lib/spread-types";
import {
  buildTimelineFrames,
  densityTiers,
  formatDate,
  getDensityLabel,
  getRiskColor
} from "@/lib/spread-utils";

const SPEED_MS = 1600;

export function SpreadExplorer() {
  const [datasets, setDatasets] = useState<SpreadDataset[]>(() =>
    sampleDatasets.map((d) => ({ ...d, entries: [...d.entries] }))
  );
  const [activeId, setActiveId] = useState(sampleDatasets[0].id);
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [colorMode, setColorMode] = useState<ColorMode>("cases");

  const active = useMemo(
    () => datasets.find((d) => d.id === activeId) ?? datasets[0],
    [datasets, activeId]
  );

  const frames = useMemo(
    () => buildTimelineFrames(active.entries),
    [active.entries]
  );

  const maxIndex = Math.max(0, frames.length - 1);
  const safeIndex = Math.min(frameIndex, maxIndex);
  const currentFrame = frames[safeIndex];

  useEffect(() => {
    setFrameIndex(Math.max(0, frames.length - 1));
    setPlaying(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  useEffect(() => {
    if (!playing) return;
    if (safeIndex >= maxIndex) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setFrameIndex((i) => i + 1), SPEED_MS);
    return () => clearTimeout(timer);
  }, [playing, safeIndex, maxIndex]);

  const visibleEntries = useMemo(() => {
    if (!currentFrame) return [] as CaseEntry[];
    const ids = new Set<string>();
    for (let i = 0; i <= safeIndex; i++) {
      for (const e of frames[i].entries) ids.add(e.id);
    }
    return active.entries.filter((e) => ids.has(e.id));
  }, [active.entries, frames, safeIndex, currentFrame]);

  const totals = useMemo(() => {
    if (!currentFrame) {
      return { confirmed: 0, deaths: 0, recovered: 0, locations: 0, countries: 0 };
    }
    let confirmed = 0;
    let deaths = 0;
    let recovered = 0;
    for (const cum of Object.values(currentFrame.cumulativeByLocation)) {
      confirmed += cum.confirmed;
      deaths += cum.deaths;
      recovered += cum.recovered;
    }
    return {
      confirmed,
      deaths,
      recovered,
      locations: visibleEntries.length,
      countries: new Set(visibleEntries.map((e) => e.country)).size
    };
  }, [currentFrame, visibleEntries]);

  const densityInsight = useMemo(() => {
    const withDensity = visibleEntries.filter(
      (e) => e.populationDensity !== undefined
    );
    if (withDensity.length === 0) return null;

    let highCases = 0;
    let lowCases = 0;
    for (const e of withDensity) {
      if ((e.populationDensity ?? 0) >= 5000) highCases += e.confirmed;
      else lowCases += e.confirmed;
    }
    const total = highCases + lowCases;
    const highShare = total > 0 ? Math.round((highCases / total) * 100) : 0;
    return { highShare, lowShare: 100 - highShare, total };
  }, [visibleEntries]);

  function handleAddEntries(rows: Omit<CaseEntry, "id">[]) {
    setDatasets((prev) =>
      prev.map((d) => {
        if (d.id !== activeId) return d;
        const withIds: CaseEntry[] = rows.map((r, i) => ({
          ...r,
          id: `${activeId}-${Date.now()}-${i}`
        }));
        return { ...d, entries: [...d.entries, ...withIds] };
      })
    );
    setPlaying(false);
    // jump to end to reveal newly added data
    setTimeout(() => setFrameIndex(Number.MAX_SAFE_INTEGER), 0);
  }

  function handleCreateCategory(meta: NewCategoryMeta) {
    const id = `${meta.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
    const dataset: SpreadDataset = {
      id,
      name: meta.name,
      pathogen: meta.pathogen,
      description: meta.description,
      color: meta.color,
      firstDetected: new Date().toISOString().slice(0, 10),
      entries: []
    };
    setDatasets((prev) => [...prev, dataset]);
    setActiveId(id);
  }

  const hasData = frames.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-slate-950 text-white shadow-soft-xl">
        <div className="grid gap-6 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_32rem)] p-8 lg:p-10">
          <div className="flex items-center gap-2 text-cyan-100">
            <Globe2 className="h-5 w-5" />
            <span className="text-sm font-medium uppercase tracking-[0.2em]">
              Geographic spread explorer
            </span>
          </div>
          <div>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
              Watch an outbreak unfold across a movable 3D globe, day by day.
            </h1>
            <p className="mt-4 max-w-2xl leading-7 text-slate-300">
              {active.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {datasets.map((d) => {
              const isActive = d.id === activeId;
              return (
                <button
                  key={d.id}
                  onClick={() => setActiveId(d.id)}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "border-white/40 bg-white/15 text-white"
                      : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: d.color }}
                  />
                  {d.name}
                  <span className="text-xs text-slate-400">
                    {d.entries.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Confirmed cases" value={totals.confirmed.toLocaleString()} tone="blue" />
        <StatTile label="Deaths" value={totals.deaths.toLocaleString()} tone="rose" />
        <StatTile label="Affected locations" value={totals.locations.toString()} tone="teal" />
        <StatTile label="Countries / territories" value={totals.countries.toString()} tone="orange" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.55fr_0.45fr]">
        <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-slate-900 shadow-soft-xl">
          <div className="relative h-[460px] w-full sm:h-[560px]">
            {hasData ? (
              <SpreadMap
                frames={frames}
                currentFrameIndex={safeIndex}
                allEntries={active.entries}
                colorMode={colorMode}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                <Layers className="h-8 w-8" />
                <p className="text-sm">
                  No records in “{active.name}” yet — add data below to render the spread.
                </p>
              </div>
            )}

            <div className="pointer-events-none absolute left-4 top-4 z-[1000] rounded-2xl bg-slate-950/80 px-4 py-3 text-white backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                {colorMode === "cases" ? "Case intensity" : "Population density"}
              </p>
              <p className="text-lg font-semibold">
                {currentFrame ? formatDate(currentFrame.date) : "—"}
              </p>
            </div>

            <div className="absolute right-4 top-4 z-[1000] flex flex-col gap-2">
              <div className="pointer-events-auto inline-flex rounded-full bg-slate-950/80 p-1 backdrop-blur">
                <ModeButton active={colorMode === "cases"} onClick={() => setColorMode("cases")}>
                  Cases
                </ModeButton>
                <ModeButton active={colorMode === "density"} onClick={() => setColorMode("density")}>
                  Density
                </ModeButton>
              </div>
            </div>

            <div className="pointer-events-none absolute bottom-4 left-4 z-[1000] rounded-2xl bg-slate-950/80 px-4 py-3 text-white backdrop-blur">
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                {colorMode === "cases"
                  ? "Confirmed cases (dots)"
                  : "Population density (country shading)"}
              </p>
              <div className="flex flex-col gap-1.5">
                {colorMode === "cases"
                  ? [
                      { c: getRiskColor(1), l: "< 10" },
                      { c: getRiskColor(50), l: "10 – 100" },
                      { c: getRiskColor(500), l: "100 – 1k" },
                      { c: getRiskColor(5000), l: "1k – 10k" },
                      { c: getRiskColor(50000), l: "10k+" }
                    ].map((row) => <LegendRow key={row.l} color={row.c} label={row.l} />)
                  : densityTiers.map((t) => (
                      <LegendRow key={t.label} color={t.color} label={t.label} />
                    ))}
              </div>
              {colorMode === "density" && (
                <p className="mt-2 max-w-[12rem] text-[11px] leading-4 text-slate-400">
                  Dots mark case counts (sized by confirmed) over the shaded
                  density map.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/10 bg-slate-950 px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (safeIndex >= maxIndex) setFrameIndex(0);
                  setPlaying((p) => !p);
                }}
                disabled={!hasData}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-40"
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </button>
              <button
                onClick={() => {
                  setPlaying(false);
                  setFrameIndex(0);
                }}
                disabled={!hasData}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-40"
                aria-label="Restart"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setPlaying(false);
                  setFrameIndex(maxIndex);
                }}
                disabled={!hasData}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-40"
                aria-label="Jump to end"
              >
                <SkipForward className="h-4 w-4" />
              </button>

              <input
                type="range"
                min={0}
                max={maxIndex}
                value={safeIndex}
                disabled={!hasData}
                onChange={(e) => {
                  setPlaying(false);
                  setFrameIndex(parseInt(e.target.value, 10));
                }}
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/20 accent-blue-500"
              />
              <span className="w-32 text-right text-sm tabular-nums text-slate-300">
                {currentFrame ? formatDate(currentFrame.date) : "—"}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Day {hasData ? safeIndex + 1 : 0} of {frames.length} · Drag the
              globe to inspect the planet, or press play to animate the spread
              with pulsing arrivals and moving flow arcs.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-soft-xl backdrop-blur">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-blue-50 p-2.5 text-blue-700">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                  Density signal
                </p>
                <h3 className="text-base font-semibold text-slate-950">
                  Where cases concentrate
                </h3>
              </div>
            </div>

            {densityInsight ? (
              <div className="space-y-4">
                <p className="text-sm leading-6 text-slate-600">
                  Of confirmed cases reported so far,{" "}
                  <strong className="text-slate-900">
                    {densityInsight.highShare}%
                  </strong>{" "}
                  are in high-density areas (5,000+ people/km²) versus{" "}
                  <strong className="text-slate-900">
                    {densityInsight.lowShare}%
                  </strong>{" "}
                  in lower-density areas — a key driver of transmission speed.
                </p>
                <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="bg-pink-500"
                    style={{ width: `${densityInsight.highShare}%` }}
                  />
                  <div
                    className="bg-cyan-400"
                    style={{ width: `${densityInsight.lowShare}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>High density</span>
                  <span>Lower density</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Add population density values to your records to compare spread
                across dense vs. sparse areas.
              </p>
            )}
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-soft-xl backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
              Newest locations on this date
            </p>
            <div className="mt-3 space-y-2">
              {currentFrame && currentFrame.entries.length > 0 ? (
                currentFrame.entries.slice(0, 6).map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2 text-sm first:border-0 first:pt-0"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{e.location}</p>
                      <p className="text-xs text-slate-500">
                        {e.country} · {getDensityLabel(e.populationDensity)}
                      </p>
                    </div>
                    <span className="font-semibold tabular-nums text-blue-700">
                      {e.confirmed.toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No new reports on this date.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <CaseInputPanel
        activeDatasetName={active.name}
        entryCount={active.entries.length}
        onAddEntries={handleAddEntries}
        onCreateCategory={handleCreateCategory}
      />
    </div>
  );
}

function StatTile({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone: "blue" | "rose" | "teal" | "orange";
}) {
  const tones: Record<typeof tone, string> = {
    blue: "text-blue-700",
    rose: "text-rose-600",
    teal: "text-teal-700",
    orange: "text-orange-600"
  };
  return (
    <div className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-soft-xl backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-semibold tabular-nums ${tones[tone]}`}>
        {value}
      </p>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
        active ? "bg-blue-600 text-white" : "text-slate-300 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-200">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </div>
  );
}
