"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import * as THREE from "three";
import worldCountries from "@/lib/world-countries.json";
import type { CaseEntry, TimelineFrame } from "@/lib/spread-types";
import {
  densityTiers,
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

type CountryFeature = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: unknown;
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

const DENSITY_ACCENT = "#fde047";
const COUNTRY_NAME_ALIASES: Record<string, string> = {
  "united states": "united states of america",
  uae: "united arab emirates",
  "united arab emirates": "united arab emirates",
  "south korea": "south korea"
};

const countryFeatures = (worldCountries as { features: CountryFeature[] })
  .features;

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

  const globeMaterial = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        color: "#0b1f3a",
        emissive: "#05101f",
        emissiveIntensity: 0.4,
        shininess: 6
      }),
    []
  );

  // Per-country average population density (stable across the timeline).
  const densityByCountry = useMemo(() => {
    const totals = new Map<string, { sum: number; count: number }>();
    for (const entry of allEntries) {
      if (entry.populationDensity === undefined) continue;
      const key = canonicalCountry(entry.country);
      const current = totals.get(key) ?? { sum: 0, count: 0 };
      current.sum += entry.populationDensity;
      current.count += 1;
      totals.set(key, current);
    }
    const averaged = new Map<string, number>();
    for (const [key, value] of totals) {
      averaged.set(key, value.sum / value.count);
    }
    return averaged;
  }, [allEntries]);

  const densityRange = useMemo(() => {
    const values = [...densityByCountry.values()];
    if (values.length === 0) return { min: 0, max: 1 };
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [densityByCountry]);

  const featureDensity = useMemo(() => {
    const lookup = new Map<CountryFeature, number>();
    for (const feature of countryFeatures) {
      const names = featureNames(feature);
      for (const name of names) {
        const density = densityByCountry.get(name);
        if (density !== undefined) {
          lookup.set(feature, density);
          break;
        }
      }
    }
    return lookup;
  }, [densityByCountry]);

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
    const firstArrivalByPlace = new Map<string, CaseEntry>();
    for (const entry of visibleEntries) {
      const key = placeKey(entry);
      latestByPlace.set(key, entry);
      if (!firstArrivalByPlace.has(key)) firstArrivalByPlace.set(key, entry);
    }

    const points: GlobePoint[] = [...latestByPlace.values()].map((entry) => ({
      id: placeKey(entry),
      lat: entry.coords.lat,
      lng: entry.coords.lng,
      location: entry.location,
      country: entry.country,
      confirmed: entry.confirmed,
      deaths: entry.deaths,
      recovered: entry.recovered,
      populationDensity: entry.populationDensity,
      date: entry.date,
      color: colorMode === "density" ? DENSITY_ACCENT : getRiskColor(entry.confirmed),
      radius: Math.max(0.18, getMarkerRadius(entry.confirmed) / 52)
    }));

    const origin = [...allEntries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )[0];
    const currentIds = new Set(
      frames[currentFrameIndex]?.entries.map((entry) => entry.id) ?? []
    );

    const arcs: FlowArc[] = origin
      ? [...firstArrivalByPlace.values()]
          .filter((entry) => placeKey(entry) !== placeKey(origin))
          .map((entry) => ({
            id: `${placeKey(origin)}->${placeKey(entry)}`,
            startLat: origin.coords.lat,
            startLng: origin.coords.lng,
            endLat: entry.coords.lat,
            endLng: entry.coords.lng,
            startLabel: origin.location,
            endLabel: entry.location,
            confirmed: entry.confirmed,
            color:
              colorMode === "density"
                ? DENSITY_ACCENT
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
            ? DENSITY_ACCENT
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
        globeMaterial={globeMaterial}
        showAtmosphere
        atmosphereColor="#38bdf8"
        atmosphereAltitude={0.18}
        polygonsData={countryFeatures}
        polygonAltitude={0.008}
        polygonCapColor={(feature: object) => {
          if (colorMode !== "density") return "rgba(30, 58, 95, 0.45)";
          const density = featureDensity.get(feature as CountryFeature);
          if (density === undefined) return "rgba(51, 65, 85, 0.25)";
          return densityColor(density, densityRange.min, densityRange.max);
        }}
        polygonSideColor={() => "rgba(0, 0, 0, 0)"}
        polygonStrokeColor={() => "rgba(148, 197, 255, 0.55)"}
        polygonsTransitionDuration={0}
        polygonLabel={(feature: object) =>
          countryLabel(feature as CountryFeature, featureDensity)
        }
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointAltitude={(point: object) =>
          Math.min(0.085, 0.014 + (point as GlobePoint).confirmed / 1200000)
        }
        pointRadius={(point: object) => (point as GlobePoint).radius}
        pointColor={(point: object) => (point as GlobePoint).color}
        pointResolution={24}
        pointsTransitionDuration={0}
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
            : [hexToRgba(flow.color, 0.15), hexToRgba(flow.color, 0.6)];
        }}
        arcAltitude={(arc: object) =>
          Math.min(0.6, 0.16 + Math.log10((arc as FlowArc).confirmed + 1) * 0.07)
        }
        arcStroke={(arc: object) => ((arc as FlowArc).active ? 0.9 : 0.35)}
        arcDashLength={0.6}
        arcDashGap={0.15}
        arcDashInitialGap={1}
        arcDashAnimateTime={1500}
        arcsTransitionDuration={0}
        arcLabel={(arc: object) => {
          const flow = arc as FlowArc;
          return `<b>${escapeHtml(flow.startLabel)} → ${escapeHtml(
            flow.endLabel
          )}</b><br/>First recorded arrival: ${flow.confirmed.toLocaleString()} confirmed`;
        }}
        ringsData={rings}
        ringLat="lat"
        ringLng="lng"
        ringColor={(ring: object) => {
          const color = (ring as Ring).color;
          return (t: number) => hexToRgba(color, 1 - t);
        }}
        ringMaxRadius={(ring: object) =>
          Math.min(8, Math.max(2.5, Math.log10((ring as Ring).confirmed + 10) * 2.2))
        }
        ringPropagationSpeed={1.8}
        ringRepeatPeriod={750}
      />
    </div>
  );
}

function placeKey(entry: CaseEntry): string {
  return `${entry.location}-${entry.country}`.toLowerCase();
}

function canonicalCountry(country: string): string {
  const normalized = country.trim().toLowerCase();
  return COUNTRY_NAME_ALIASES[normalized] ?? normalized;
}

function featureNames(feature: CountryFeature): string[] {
  const props = feature.properties;
  const candidates = [
    props.NAME,
    props.ADMIN,
    props.NAME_LONG,
    props.SOVEREIGNT,
    props.BRK_NAME,
    props.GEOUNIT
  ];
  return candidates
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim().toLowerCase());
}

function densityColor(value: number, min: number, max: number): string {
  const stops = densityTiers.map((tier) => tier.color);
  const logMin = Math.log10(Math.max(1, min));
  const logMax = Math.log10(Math.max(logMin + 0.0001, max));
  const t = clamp((Math.log10(Math.max(1, value)) - logMin) / (logMax - logMin), 0, 1);
  const scaled = t * (stops.length - 1);
  const lower = Math.floor(scaled);
  const upper = Math.min(stops.length - 1, lower + 1);
  const localT = scaled - lower;
  return mixHex(stops[lower], stops[upper], localT);
}

function countryLabel(
  feature: CountryFeature,
  featureDensity: Map<CountryFeature, number>
): string {
  const name =
    (feature.properties.NAME as string) ??
    (feature.properties.ADMIN as string) ??
    "Unknown";
  const density = featureDensity.get(feature);
  if (density === undefined) return `<b>${escapeHtml(name)}</b>`;
  return `<div style="min-width:160px">
    <strong>${escapeHtml(name)}</strong>
    <div style="font-size:12px;color:#cbd5f5;margin-top:4px">Avg. density: ${Math.round(
      density
    ).toLocaleString()} /km²<br/>${getDensityLabel(density)}</div>
  </div>`;
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function mixHex(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const r = Math.round(ca.r + (cb.r - ca.r) * t);
  const g = Math.round(ca.g + (cb.g - ca.g) * t);
  const bch = Math.round(ca.b + (cb.b - ca.b) * t);
  return `rgb(${r}, ${g}, ${bch})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16)
  };
}

function hexToRgba(hex: string, alpha: number): string {
  if (hex.startsWith("#")) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
