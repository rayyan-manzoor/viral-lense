"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { AlertTriangle, MapPinned, ShieldCheck, Syringe } from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import {
  ageRisk,
  filterRecords,
  recommendation,
  regionRisk,
  summarizeMetrics,
  weeklyTrend
} from "@/lib/analytics";
import {
  ageGroups,
  diseases,
  outbreakRecords,
  regions
} from "@/lib/outbreak-data";
import type { AgeGroup, DashboardFilters, Disease, Region } from "@/lib/types";

const allRegions = ["All Regions", ...regions] as const;
const allAges = ["All Ages", ...ageGroups] as const;

export function OutbreakDashboard() {
  const [filters, setFilters] = useState<DashboardFilters>({
    disease: "Nova Flu",
    region: "All Regions",
    ageGroup: "All Ages"
  });

  const filteredRecords = useMemo(
    () => filterRecords(outbreakRecords, filters),
    [filters]
  );
  const metrics = useMemo(() => summarizeMetrics(filteredRecords), [filteredRecords]);
  const trend = useMemo(() => weeklyTrend(filteredRecords), [filteredRecords]);
  const regionsByRisk = useMemo(() => regionRisk(filteredRecords), [filteredRecords]);
  const agesByRisk = useMemo(() => ageRisk(filteredRecords), [filteredRecords]);
  const actionPlan = useMemo(() => recommendation(filteredRecords), [filteredRecords]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10">
      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-slate-950 text-white shadow-soft-xl">
        <div className="grid gap-8 bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.24),transparent_34rem)] p-8 lg:grid-cols-[1.15fr_0.85fr] lg:p-10">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-cyan-100">
              <ShieldCheck className="h-4 w-4" />
              Public-health intelligence dashboard
            </div>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
              Viral Lense tracks outbreak risk before it overwhelms care systems.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Analyze simulated disease surveillance data across regions and age
              groups, surface growth signals, and translate epidemiology metrics into
              targeted intervention recommendations.
            </p>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-cyan-300/20 p-3 text-cyan-100">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-cyan-100">
                  Recommended response
                </p>
                <h2 className="text-xl font-semibold">Targeted containment brief</h2>
              </div>
            </div>
            <p className="leading-7 text-slate-200">{actionPlan}</p>
            <div className="mt-6 grid grid-cols-2 gap-3 text-sm text-slate-200">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-slate-400">Highest-risk region</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {regionsByRisk[0]?.region ?? "N/A"}
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-slate-400">Most affected age group</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {agesByRisk[0]?.ageGroup ?? "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-3xl border border-white/70 bg-white/75 p-4 shadow-soft-xl backdrop-blur lg:grid-cols-3">
        <FilterSelect
          label="Disease"
          value={filters.disease}
          options={diseases}
          onChange={(disease) =>
            setFilters((current) => ({ ...current, disease: disease as Disease }))
          }
        />
        <FilterSelect
          label="Region"
          value={filters.region}
          options={allRegions}
          onChange={(region) =>
            setFilters((current) => ({ ...current, region: region as Region | "All Regions" }))
          }
        />
        <FilterSelect
          label="Age group"
          value={filters.ageGroup}
          options={allAges}
          onChange={(ageGroup) =>
            setFilters((current) => ({ ...current, ageGroup: ageGroup as AgeGroup | "All Ages" }))
          }
        />
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => (
          <MetricCard key={metric.label} metric={metric} index={index} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <Panel
          eyebrow="Transmission velocity"
          title="Weekly cases and hospitalizations"
          icon={<Syringe className="h-5 w-5" />}
        >
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="cases" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "16px"
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cases"
                  stroke="#2563eb"
                  strokeWidth={3}
                  fill="url(#cases)"
                />
                <Area
                  type="monotone"
                  dataKey="hospitalizations"
                  stroke="#f97316"
                  strokeWidth={2}
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel
          eyebrow="Age vulnerability"
          title="Latest incidence by age"
          icon={<MapPinned className="h-5 w-5" />}
        >
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agesByRisk} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="ageGroup"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value) => [`${value} per 100k`, "Incidence"]}
                  contentStyle={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "16px"
                  }}
                />
                <Bar dataKey="incidence" fill="#0f766e" radius={[0, 10, 10, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </section>

      <Panel
        eyebrow="Geographic prioritization"
        title="Regional outbreak risk queue"
        icon={<MapPinned className="h-5 w-5" />}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {regionsByRisk.map((region, index) => (
            <article
              key={region.region}
              className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
            >
              <div className="mb-5 flex items-center justify-between">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                  #{index + 1} priority
                </span>
                <span className="text-sm font-semibold text-blue-700">
                  {region.riskScore}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-slate-950">{region.region}</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <RiskRow label="Latest cases" value={region.latestCases.toString()} />
                <RiskRow label="Incidence" value={`${region.incidence} / 100k`} />
                <RiskRow
                  label="Growth"
                  value={`${region.growth >= 0 ? "+" : ""}${region.growth}%`}
                />
              </dl>
            </article>
          ))}
        </div>
      </Panel>
    </main>
  );
}

type FilterSelectProps<T extends readonly string[]> = {
  label: string;
  value: string;
  options: T;
  onChange: (value: T[number]) => void;
};

function FilterSelect<T extends readonly string[]>({
  label,
  value,
  options,
  onChange
}: FilterSelectProps<T>) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T[number])}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-950 outline-none ring-blue-500/20 transition focus:ring-4"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Panel({
  eyebrow,
  title,
  icon,
  children
}: {
  eyebrow: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-soft-xl backdrop-blur">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">{icon}</div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function RiskRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-semibold text-slate-950">{value}</dd>
    </div>
  );
}
