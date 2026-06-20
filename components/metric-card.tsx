import { Activity, BarChart3, HeartPulse, Users } from "lucide-react";
import type { MetricCard as MetricCardType } from "@/lib/types";

const toneStyles: Record<MetricCardType["tone"], string> = {
  blue: "border-blue-100 bg-blue-50/80 text-blue-700",
  teal: "border-teal-100 bg-teal-50/80 text-teal-700",
  orange: "border-orange-100 bg-orange-50/80 text-orange-700",
  rose: "border-rose-100 bg-rose-50/80 text-rose-700"
};

const icons = [Activity, BarChart3, HeartPulse, Users];

type Props = {
  metric: MetricCardType;
  index: number;
};

export function MetricCard({ metric, index }: Props) {
  const Icon = icons[index % icons.length];

  return (
    <article className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-soft-xl backdrop-blur">
      <div
        className={`mb-5 inline-flex rounded-2xl border p-3 ${toneStyles[metric.tone]}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium text-slate-500">{metric.label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
        {metric.value}
      </p>
      <p className="mt-2 text-sm text-slate-500">{metric.detail}</p>
    </article>
  );
}
