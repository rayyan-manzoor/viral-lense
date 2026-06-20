"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import type { CaseEntry, TimelineFrame } from "@/lib/spread-types";
import {
  getDensityColor,
  getDensityLabel,
  getMarkerRadius,
  getRiskColor
} from "@/lib/spread-utils";

export type ColorMode = "cases" | "density";

type Props = {
  frames: TimelineFrame[];
  currentFrameIndex: number;
  allEntries: CaseEntry[];
  colorMode: ColorMode;
};

type GlobePoint = {
  id: string;
  lat: number;
  lng: number;
  location: string;
  country: string;
  confirmed: number;
  deaths: number;
  recovered: number;
  populationDensity?: number;
  date: string;
  color: string;
  radius: number;
};

type FlowArc = {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  startLabel: string;
  endLabel: string;
  confirmed: number;
  color: string;
  active: boolean;
};

type Ring = {
  id: string;
  lat: number;
  lng: number;
  color: string;
  confirmed: number;
};

export function SpreadGlobeClient({
  frames,
  currentFrameIndex,
  allEntries,
  colorMode
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 900, height: 560 });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({
        width: Math.max(320, Math.floor(width)),
        height: Math.max(420, Math.floor(height))
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const { points, arcs, rings } = useMemo(() => {
    const visibleIds = new Set<string>();
    for (let i = 0; i <= currentFrameIndex; i++) {
      for (const entry of frames[i]?.entries ?? []) {
        visibleIds.add(entry.id);
      }
    }

    const visibleEntries = allEntries
      .filter((entry) => visibleIds.has(entry.id))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const latestByPlace = new Map<string, CaseEntry>();
    for (const entry of visibleEntries) {
      latestByPlace.set(placeKey(entry), entry);
    }

    const points: GlobePoint[] = [...latestByPlace.values()].map((entry) => {
      const confirmed = entry.confirmed;
      const color =
        colorMode === "density"
          ? getDensityColor(entry.populationDensity)
          : getRiskColor(confirmed);

      return {
        id: placeKey(entry),
        lat: entry.coords.lat,
        lng: entry.coords.lng,
        location: entry.location,
        country: entry.country,
        confirmed,
        deaths: entry.deaths,
        recovered: entry.recovered,
        populationDensity: entry.populationDensity,
        date: entry.date,
        color,
        radius: Math.max(0.18, getMarkerRadius(confirmed) / 52)
      };
    });

    const origin = [...allEntries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )[0];
    const currentIds = new Set(
      frames[currentFrameIndex]?.entries.map((entry) => entry.id) ?? []
    );
    const firstArrivalByPlace = new Map<string, CaseEntry>();
    for (const entry of visibleEntries) {
      const key = placeKey(entry);
      if (!firstArrivalByPlace.has(key)) firstArrivalByPlace.set(key, entry);
    }

    const arcs: FlowArc[] = origin
      ? [...firstArrivalByPlace.values()]
          .filter((entry) => placeKey(entry) !== placeKey(origin))
          .map((entry) => ({
            id: `${placeKey(origin)}-${placeKey(entry)}`,
            startLat: origin.coords.lat,
            startLng: origin.coords.lng,
            endLat: entry.coords.lat,
            endLng: entry.coords.lng,
            startLabel: origin.location,
            endLabel: entry.location,
            confirmed: entry.confirmed,
            color:
              colorMode === "density"
                ? getDensityColor(entry.populationDensity)
                : getRiskColor(entry.confirmed),
            active: currentIds.has(entry.id)
          }))
      : [];

    const rings: Ring[] = (frames[currentFrameIndex]?.entries ?? []).map(
      (entry) => ({
        id: entry.id,
        lat: entry.coords.lat,
        lng: entry.coords.lng,
        color:
          colorMode === "density"
            ? getDensityColor(entry.populationDensity)
            : getRiskColor(entry.confirmed),
        confirmed: entry.confirmed
      })
    );

    return { points, arcs, rings };
  }, [allEntries, colorMode, currentFrameIndex, frames]);

  return (
    <div ref={containerRef} className="h-full w-full bg-slate-950">
      <Globe
        width={size.width}
        height={size.height}
        backgroundColor="rgba(2, 6, 23, 1)"
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        showAtmosphere
        atmosphereColor="#38bdf8"
        atmosphereAltitude={0.2}
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointAltitude={(point: object) =>
          Math.min(0.08, 0.012 + (point as GlobePoint).confirmed / 1200000)
        }
        pointRadius={(point: object) => (point as GlobePoint).radius}
        pointColor={(point: object) => (point as GlobePoint).color}
        pointResolution={24}
        pointLabel={(point: object) => pointLabel(point as GlobePoint)}
        arcsData={arcs}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor={(arc: object) => {
          const flow = arc as FlowArc;
          return flow.active
            ? [flow.color, "#ffffff"]
            : ["rgba(148, 163, 184, 0.35)", flow.color];
        }}
        arcAltitude={(arc: object) =>
          Math.min(0.62, 0.18 + Math.log10((arc as FlowArc).confirmed + 1) * 0.08)
        }
        arcStroke={(arc: object) => ((arc as FlowArc).active ? 0.85 : 0.35)}
        arcDashLength={0.45}
        arcDashGap={1.2}
        arcDashInitialGap={(arc: object) => {
          const hash = (arc as FlowArc).id
            .split("")
            .reduce((total, char) => total + char.charCodeAt(0), 0);
          return hash % 2;
        }}
        arcDashAnimateTime={2200}
        arcLabel={(arc: object) => {
          const flow = arc as FlowArc;
          return `<b>${flow.startLabel} → ${flow.endLabel}</b><br/>First recorded arrival: ${flow.confirmed.toLocaleString()} confirmed`;
        }}
        ringsData={rings}
        ringLat="lat"
        ringLng="lng"
        ringColor={(ring: object) => (ring as Ring).color}
        ringMaxRadius={(ring: object) =>
          Math.min(8, Math.max(2.5, Math.log10((ring as Ring).confirmed + 10) * 2.2))
        }
        ringPropagationSpeed={1.6}
        ringRepeatPeriod={900}
        labelsData={points}
        labelLat="lat"
        labelLng="lng"
        labelText="location"
        labelSize={0.65}
        labelDotRadius={0.18}
        labelColor={(point: object) => (point as GlobePoint).color}
        labelResolution={2}
      />
    </div>
  );
}

function placeKey(entry: CaseEntry): string {
  return `${entry.location}-${entry.country}`.toLowerCase();
}

function pointLabel(point: GlobePoint): string {
  const density =
    point.populationDensity !== undefined
      ? `${point.populationDensity.toLocaleString()} /km² · ${getDensityLabel(
          point.populationDensity
        )}`
      : "Unknown";

  return `<div style="min-width:180px">
    <strong style="font-size:14px">${escapeHtml(point.location)}</strong>
    <div style="color:#94a3b8;font-size:12px;margin-bottom:6px">${escapeHtml(
      point.country
    )} · ${point.date}</div>
    <div style="display:flex;flex-direction:column;gap:3px;font-size:13px">
      <span>Confirmed: <strong>${point.confirmed.toLocaleString()}</strong></span>
      <span>Deaths: <strong>${point.deaths.toLocaleString()}</strong></span>
      <span>Recovered: <strong>${point.recovered.toLocaleString()}</strong></span>
      <span>Pop. density: <strong>${density}</strong></span>
    </div>
  </div>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
