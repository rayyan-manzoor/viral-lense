"use client";

import { useEffect, useRef } from "react";
import type { CircleMarker, Map as LeafletMap } from "leaflet";
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

export function SpreadMapClient({
  frames,
  currentFrameIndex,
  allEntries,
  colorMode
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Record<string, CircleMarker>>({});

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    let cancelled = false;

    const initMap = async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || mapRef.current || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: [25, 60],
        zoom: 2,
        worldCopyJump: true,
        zoomControl: true,
        scrollWheelZoom: true
      });

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19
        }
      ).addTo(map);

      mapRef.current = map;
      rebuildMarkers(L);
      updateMarkers();
    };

    const rebuildMarkers = (L: typeof import("leaflet")) => {
      const map = mapRef.current;
      if (!map) return;

      for (const marker of Object.values(markersRef.current)) {
        marker.remove();
      }
      markersRef.current = {};

      for (const entry of allEntries) {
        const marker = L.circleMarker([entry.coords.lat, entry.coords.lng], {
          radius: 0,
          fillOpacity: 0,
          opacity: 0
        }).addTo(map);

        marker.bindPopup(buildPopup(entry));
        markersRef.current[entry.id] = marker;
      }
    };

    initMap();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = {};
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEntries]);

  function updateMarkers() {
    const map = mapRef.current;
    if (!map) return;

    const frame = frames[currentFrameIndex];
    if (!frame) {
      for (const marker of Object.values(markersRef.current)) {
        marker.setStyle({ radius: 0, fillOpacity: 0, opacity: 0 });
      }
      return;
    }

    const visible = new Set<string>();
    for (let i = 0; i <= currentFrameIndex; i++) {
      for (const entry of frames[i].entries) visible.add(entry.id);
    }

    for (const [id, marker] of Object.entries(markersRef.current)) {
      const entry = allEntries.find((e) => e.id === id);
      if (!entry || !visible.has(id)) {
        marker.setStyle({ radius: 0, fillOpacity: 0, opacity: 0 });
        continue;
      }

      const cum = frame.cumulativeByLocation[id];
      const confirmed = cum?.confirmed ?? entry.confirmed;
      const fill =
        colorMode === "density"
          ? getDensityColor(entry.populationDensity)
          : getRiskColor(confirmed);

      marker.setStyle({
        radius: getMarkerRadius(confirmed),
        fillColor: fill,
        color: "rgba(255,255,255,0.3)",
        weight: 1,
        fillOpacity: 0.78,
        opacity: 1
      });
    }
  }

  useEffect(() => {
    updateMarkers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFrameIndex, frames, colorMode]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", borderRadius: "inherit" }}
    />
  );
}

function buildPopup(entry: CaseEntry): string {
  const density =
    entry.populationDensity !== undefined
      ? `${entry.populationDensity.toLocaleString()} /km² · ${getDensityLabel(
          entry.populationDensity
        )}`
      : "Unknown";

  return `<div style="min-width:180px">
    <strong style="font-size:14px">${escapeHtml(entry.location)}</strong>
    <div style="color:#6b7280;font-size:12px;margin-bottom:6px">${escapeHtml(
      entry.country
    )} · ${entry.date}</div>
    <div style="display:flex;flex-direction:column;gap:3px;font-size:13px">
      <span>Confirmed: <strong>${entry.confirmed.toLocaleString()}</strong></span>
      <span>Deaths: <strong>${entry.deaths.toLocaleString()}</strong></span>
      <span>Recovered: <strong>${entry.recovered.toLocaleString()}</strong></span>
      <span>Pop. density: <strong>${density}</strong></span>
    </div>
    ${
      entry.notes
        ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid #e5e7eb;font-size:11px;color:#6b7280;font-style:italic">${escapeHtml(
            entry.notes
          )}</div>`
        : ""
    }
  </div>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
