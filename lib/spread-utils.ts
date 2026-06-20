import type { CaseEntry, DensityTier, TimelineFrame } from "@/lib/spread-types";

export function buildTimelineFrames(entries: CaseEntry[]): TimelineFrame[] {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const allDates = [...new Set(sorted.map((e) => e.date))].sort();

  const frames: TimelineFrame[] = [];
  const cumulative: Record<
    string,
    { confirmed: number; deaths: number; recovered: number }
  > = {};

  for (const date of allDates) {
    const dateEntries = sorted.filter((e) => e.date === date);

    for (const entry of dateEntries) {
      const key = entry.id;
      if (!cumulative[key]) {
        cumulative[key] = { confirmed: 0, deaths: 0, recovered: 0 };
      }
      cumulative[key].confirmed = Math.max(
        cumulative[key].confirmed,
        entry.confirmed
      );
      cumulative[key].deaths = Math.max(cumulative[key].deaths, entry.deaths);
      cumulative[key].recovered = Math.max(
        cumulative[key].recovered,
        entry.recovered
      );
    }

    frames.push({
      date,
      entries: dateEntries,
      cumulativeByLocation: { ...cumulative }
    });
  }

  return frames;
}

const COLUMN_ALIASES: Record<keyof RawRow, string[]> = {
  date: ["date", "day", "report_date", "reported"],
  location: ["location", "city", "place", "region", "area"],
  country: ["country", "nation"],
  lat: ["lat", "latitude"],
  lng: ["lng", "lon", "long", "longitude"],
  confirmed: ["confirmed", "cases", "confirmed_cases", "count"],
  deaths: ["deaths", "fatalities", "died"],
  recovered: ["recovered", "recoveries"],
  populationdensity: [
    "populationdensity",
    "population_density",
    "density",
    "pop_density",
    "people_per_km2"
  ],
  notes: ["notes", "note", "comment", "source"]
};

type RawRow = {
  date: string;
  location: string;
  country: string;
  lat: string;
  lng: string;
  confirmed: string;
  deaths: string;
  recovered: string;
  populationdensity: string;
  notes: string;
};

function resolveColumn(headers: string[], field: keyof RawRow): number {
  const aliases = COLUMN_ALIASES[field];
  return headers.findIndex((h) => aliases.includes(h.replace(/\s+/g, "")));
}

function rowsToEntries(
  headers: string[],
  rows: string[][]
): Omit<CaseEntry, "id">[] {
  const normalized = headers.map((h) => h.trim().toLowerCase());

  const idx = {
    date: resolveColumn(normalized, "date"),
    location: resolveColumn(normalized, "location"),
    country: resolveColumn(normalized, "country"),
    lat: resolveColumn(normalized, "lat"),
    lng: resolveColumn(normalized, "lng"),
    confirmed: resolveColumn(normalized, "confirmed"),
    deaths: resolveColumn(normalized, "deaths"),
    recovered: resolveColumn(normalized, "recovered"),
    populationdensity: resolveColumn(normalized, "populationdensity"),
    notes: resolveColumn(normalized, "notes")
  };

  const required: (keyof typeof idx)[] = [
    "date",
    "location",
    "country",
    "lat",
    "lng",
    "confirmed"
  ];
  const missing = required.filter((r) => idx[r] === -1);
  if (missing.length > 0) {
    throw new Error(
      `Missing required column(s): ${missing.join(", ")}. ` +
        `Expected headers like: date, location, country, lat, lng, confirmed.`
    );
  }

  const at = (row: string[], i: number) => (i === -1 ? "" : (row[i] ?? "").trim());

  return rows
    .filter((row) => row.some((cell) => cell && cell.trim() !== ""))
    .map((row) => {
      const lat = parseFloat(at(row, idx.lat));
      const lng = parseFloat(at(row, idx.lng));
      const density = parseFloat(at(row, idx.populationdensity));

      return {
        date: normalizeDate(at(row, idx.date)),
        location: at(row, idx.location),
        country: at(row, idx.country),
        coords: { lat, lng },
        confirmed: parseInt(at(row, idx.confirmed) || "0", 10) || 0,
        deaths: parseInt(at(row, idx.deaths) || "0", 10) || 0,
        recovered: parseInt(at(row, idx.recovered) || "0", 10) || 0,
        populationDensity: isNaN(density) ? undefined : density,
        notes: at(row, idx.notes) || undefined
      };
    })
    .filter((e) => !isNaN(e.coords.lat) && !isNaN(e.coords.lng) && e.location);
}

function normalizeDate(value: string): string {
  if (!value) return value;
  // Already ISO yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return value;
}

export function parseCSV(raw: string): Omit<CaseEntry, "id">[] {
  const lines = raw
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map(splitCsvLine);
  return rowsToEntries(headers, rows);
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map((c) => c.trim());
}

/** Parse an uploaded spreadsheet (.xlsx, .xls, .csv) into case entries. */
export async function parseSpreadsheet(
  file: File
): Promise<Omit<CaseEntry, "id">[]> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Spreadsheet has no sheets.");

  const sheet = workbook.Sheets[sheetName];
  const matrix: string[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    blankrows: false,
    defval: ""
  });

  if (matrix.length < 2) {
    throw new Error("Spreadsheet must have a header row and at least one data row.");
  }

  const headers = matrix[0].map((h) => String(h));
  const rows = matrix.slice(1).map((r) => r.map((c) => String(c)));
  return rowsToEntries(headers, rows);
}

export function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  });
}

export function getMarkerRadius(confirmed: number): number {
  if (confirmed <= 0) return 4;
  return Math.min(60, Math.max(6, Math.log2(confirmed + 1) * 5));
}

export function getRiskColor(confirmed: number): string {
  if (confirmed < 10) return "#f59e0b";
  if (confirmed < 100) return "#f97316";
  if (confirmed < 1000) return "#ef4444";
  if (confirmed < 10000) return "#dc2626";
  return "#7f1d1d";
}

export const densityTiers: DensityTier[] = [
  { label: "Low (< 1k /km²)", min: 0, color: "#22d3ee" },
  { label: "Moderate (1k–5k)", min: 1000, color: "#60a5fa" },
  { label: "High (5k–10k)", min: 5000, color: "#a78bfa" },
  { label: "Very high (10k+)", min: 10000, color: "#f472b6" }
];

export function getDensityColor(density?: number): string {
  if (density === undefined || isNaN(density)) return "#94a3b8";
  let color = densityTiers[0].color;
  for (const tier of densityTiers) {
    if (density >= tier.min) color = tier.color;
  }
  return color;
}

export function getDensityLabel(density?: number): string {
  if (density === undefined || isNaN(density)) return "Unknown";
  let label = densityTiers[0].label;
  for (const tier of densityTiers) {
    if (density >= tier.min) label = tier.label;
  }
  return label;
}
