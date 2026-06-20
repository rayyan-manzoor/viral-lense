"use client";

import { useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  FolderPlus,
  Plus,
  Upload,
  X
} from "lucide-react";
import type { CaseEntry } from "@/lib/spread-types";
import { parseCSV, parseSpreadsheet } from "@/lib/spread-utils";

export type NewCategoryMeta = {
  name: string;
  pathogen: string;
  description: string;
  color: string;
};

type Props = {
  activeDatasetName: string;
  entryCount: number;
  onAddEntries: (entries: Omit<CaseEntry, "id">[]) => void;
  onCreateCategory: (meta: NewCategoryMeta) => void;
};

type Tab = "manual" | "import" | "category";

const CSV_TEMPLATE =
  "date,location,country,lat,lng,confirmed,deaths,recovered,populationDensity,notes\n" +
  "2020-01-15,Bangkok,Thailand,13.7563,100.5018,1,0,0,5300,Traveler from Wuhan\n" +
  "2020-01-21,Seattle,United States,47.6062,-122.3321,1,0,0,3400,First US case";

const CATEGORY_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#6366f1",
  "#a855f7",
  "#ec4899"
];

export function CaseInputPanel({
  activeDatasetName,
  entryCount,
  onAddEntries,
  onCreateCategory
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<Tab>("manual");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    date: "",
    location: "",
    country: "",
    lat: "",
    lng: "",
    confirmed: "",
    deaths: "",
    recovered: "",
    populationDensity: "",
    notes: ""
  });

  const [csvText, setCsvText] = useState("");

  const [category, setCategory] = useState<NewCategoryMeta>({
    name: "",
    pathogen: "",
    description: "",
    color: CATEGORY_COLORS[4]
  });

  function notify(ok: string | null, err: string | null) {
    setSuccess(ok);
    setError(err);
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const lat = parseFloat(form.lat);
    const lng = parseFloat(form.lng);

    if (!form.date || !form.location || !form.country) {
      return notify(null, "Date, location, and country are required.");
    }
    if (isNaN(lat) || isNaN(lng)) {
      return notify(null, "Latitude and longitude must be valid numbers.");
    }

    const density = parseFloat(form.populationDensity);
    onAddEntries([
      {
        date: form.date,
        location: form.location,
        country: form.country,
        coords: { lat, lng },
        confirmed: parseInt(form.confirmed || "0", 10),
        deaths: parseInt(form.deaths || "0", 10),
        recovered: parseInt(form.recovered || "0", 10),
        populationDensity: isNaN(density) ? undefined : density,
        notes: form.notes || undefined
      }
    ]);

    notify(`Added ${form.location} to "${activeDatasetName}".`, null);
    setForm({
      date: "",
      location: "",
      country: "",
      lat: "",
      lng: "",
      confirmed: "",
      deaths: "",
      recovered: "",
      populationDensity: "",
      notes: ""
    });
  }

  function handleCsvSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const rows = parseCSV(csvText);
      if (rows.length === 0) return notify(null, "No valid rows found in pasted CSV.");
      onAddEntries(rows);
      notify(`Imported ${rows.length} record${rows.length !== 1 ? "s" : ""} from CSV.`, null);
      setCsvText("");
    } catch (err) {
      notify(null, err instanceof Error ? err.message : "Failed to parse CSV.");
    }
  }

  async function handleFile(file: File) {
    try {
      const rows = await parseSpreadsheet(file);
      if (rows.length === 0) {
        return notify(null, "No valid rows found in the uploaded file.");
      }
      onAddEntries(rows);
      notify(
        `Imported ${rows.length} record${rows.length !== 1 ? "s" : ""} from ${file.name}.`,
        null
      );
    } catch (err) {
      notify(null, err instanceof Error ? err.message : "Failed to read file.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleCategorySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category.name.trim()) {
      return notify(null, "Give the outbreak category a name.");
    }
    onCreateCategory({
      ...category,
      pathogen: category.pathogen || "Unknown pathogen",
      description: category.description || "User-created outbreak category."
    });
    notify(`Created category "${category.name}". It is now active.`, null);
    setCategory({
      name: "",
      pathogen: "",
      description: "",
      color: CATEGORY_COLORS[(CATEGORY_COLORS.indexOf(category.color) + 1) % CATEGORY_COLORS.length]
    });
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/85 shadow-soft-xl backdrop-blur">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-blue-50 p-2.5 text-blue-700">
            <Plus className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
              Outbreak data
            </p>
            <h3 className="text-base font-semibold text-slate-950">
              Add or import case records
              <span className="ml-2 text-sm font-normal text-slate-400">
                ({entryCount} in “{activeDatasetName}”)
              </span>
            </h3>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-slate-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-slate-200 px-6 pb-6 pt-4">
          <div className="mb-5 flex flex-wrap gap-2">
            <TabButton active={tab === "manual"} onClick={() => setTab("manual")}>
              Manual entry
            </TabButton>
            <TabButton active={tab === "import"} onClick={() => setTab("import")}>
              Import file / CSV
            </TabButton>
            <TabButton active={tab === "category"} onClick={() => setTab("category")}>
              New outbreak category
            </TabButton>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <X className="mt-0.5 h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-2xl bg-teal-50 px-4 py-3 text-sm text-teal-700">
              {success}
            </div>
          )}

          {tab === "manual" && (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date" type="date" value={form.date} onChange={(v) => setForm((f) => ({ ...f, date: v }))} required />
                <Field label="Location / City" value={form.location} onChange={(v) => setForm((f) => ({ ...f, location: v }))} placeholder="e.g. Wuhan" required />
                <Field label="Country" value={form.country} onChange={(v) => setForm((f) => ({ ...f, country: v }))} placeholder="e.g. China" required />
                <Field label="Confirmed cases" type="number" value={form.confirmed} onChange={(v) => setForm((f) => ({ ...f, confirmed: v }))} placeholder="0" />
                <Field label="Latitude" type="number" step="any" value={form.lat} onChange={(v) => setForm((f) => ({ ...f, lat: v }))} placeholder="30.5928" required />
                <Field label="Longitude" type="number" step="any" value={form.lng} onChange={(v) => setForm((f) => ({ ...f, lng: v }))} placeholder="114.3055" required />
                <Field label="Deaths" type="number" value={form.deaths} onChange={(v) => setForm((f) => ({ ...f, deaths: v }))} placeholder="0" />
                <Field label="Recovered" type="number" value={form.recovered} onChange={(v) => setForm((f) => ({ ...f, recovered: v }))} placeholder="0" />
                <Field label="Population density (/km²)" type="number" step="any" value={form.populationDensity} onChange={(v) => setForm((f) => ({ ...f, populationDensity: v }))} placeholder="e.g. 1300" />
                <Field label="Notes (optional)" value={form.notes} onChange={(v) => setForm((f) => ({ ...f, notes: v }))} placeholder="Context or source" />
              </div>
              <button type="submit" className="w-full rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
                Add to map
              </button>
            </form>
          )}

          {tab === "import" && (
            <div className="space-y-5">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFile(file);
                }}
                className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition hover:border-blue-400 hover:bg-blue-50/50"
              >
                <FileSpreadsheet className="h-7 w-7 text-blue-600" />
                <p className="text-sm font-semibold text-slate-700">
                  Drop an Excel or CSV file, or click to browse
                </p>
                <p className="text-xs text-slate-500">
                  Supports .xlsx, .xls, and .csv — columns are matched by header name
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />
              </div>

              <form onSubmit={handleCsvSubmit} className="space-y-3">
                <p className="text-xs text-slate-500">
                  …or paste CSV with headers:{" "}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-700">
                    date, location, country, lat, lng, confirmed, deaths, recovered, populationDensity, notes
                  </code>
                </p>
                <textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={CSV_TEMPLATE}
                  rows={7}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-xs text-slate-800 outline-none ring-blue-500/20 transition focus:ring-4"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setCsvText(CSV_TEMPLATE)} className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
                    <Upload className="h-4 w-4" />
                    Load template
                  </button>
                  <button type="submit" className="flex-1 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
                    Import pasted CSV
                  </button>
                </div>
              </form>
            </div>
          )}

          {tab === "category" && (
            <form onSubmit={handleCategorySubmit} className="space-y-3">
              <p className="text-sm text-slate-500">
                Create a new outbreak category for a future or different pathogen.
                Once created it becomes active, and new records you add are tracked
                separately on its own timeline.
              </p>
              <Field label="Outbreak name" value={category.name} onChange={(v) => setCategory((c) => ({ ...c, name: v }))} placeholder="e.g. Novel Respiratory Virus 2027" required />
              <Field label="Pathogen" value={category.pathogen} onChange={(v) => setCategory((c) => ({ ...c, pathogen: v }))} placeholder="e.g. NRV-2027" />
              <Field label="Description" value={category.description} onChange={(v) => setCategory((c) => ({ ...c, description: v }))} placeholder="Short summary of the outbreak" />
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-500">Accent color</span>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory((cur) => ({ ...cur, color: c }))}
                      aria-label={`Select color ${c}`}
                      className={`h-8 w-8 rounded-full transition ${
                        category.color === c ? "ring-2 ring-slate-900 ring-offset-2" : ""
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
                <FolderPlus className="h-4 w-4" />
                Create category
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({
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
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
        active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  step
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  step?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        step={step}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none ring-blue-500/20 transition focus:ring-4"
      />
    </label>
  );
}
