import type {
  AgeGroup,
  DashboardFilters,
  MetricCard,
  OutbreakRecord,
  Region
} from "@/lib/types";

const numberFormatter = new Intl.NumberFormat("en-US");
const percentFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1
});

export function filterRecords(
  records: OutbreakRecord[],
  filters: DashboardFilters
) {
  return records.filter((record) => {
    const matchesDisease = record.disease === filters.disease;
    const matchesRegion =
      filters.region === "All Regions" || record.region === filters.region;
    const matchesAge =
      filters.ageGroup === "All Ages" || record.ageGroup === filters.ageGroup;

    return matchesDisease && matchesRegion && matchesAge;
  });
}

export function summarizeMetrics(records: OutbreakRecord[]): MetricCard[] {
  const totalCases = sum(records, "cases");
  const totalHospitalizations = sum(records, "hospitalizations");
  const population = uniquePopulation(records);
  const latestWeek = latestWeekRecords(records);
  const previousWeek = previousWeekRecords(records);
  const latestCases = sum(latestWeek, "cases");
  const previousCases = sum(previousWeek, "cases");
  const growthRate =
    previousCases === 0 ? 0 : ((latestCases - previousCases) / previousCases) * 100;
  const incidence = population === 0 ? 0 : (latestCases / population) * 100000;
  const hospitalizationRate =
    totalCases === 0 ? 0 : (totalHospitalizations / totalCases) * 100;

  return [
    {
      label: "Latest weekly cases",
      value: numberFormatter.format(latestCases),
      detail: `${growthRate >= 0 ? "+" : ""}${percentFormatter.format(
        growthRate
      )}% vs previous week`,
      tone: growthRate > 15 ? "rose" : growthRate > 5 ? "orange" : "teal"
    },
    {
      label: "Incidence rate",
      value: `${percentFormatter.format(incidence)}`,
      detail: "cases per 100,000 residents",
      tone: "blue"
    },
    {
      label: "Hospitalization rate",
      value: `${percentFormatter.format(hospitalizationRate)}%`,
      detail: `${numberFormatter.format(totalHospitalizations)} total admissions`,
      tone: "orange"
    },
    {
      label: "Cumulative cases",
      value: numberFormatter.format(totalCases),
      detail: `${numberFormatter.format(population)} people in surveillance area`,
      tone: "teal"
    }
  ];
}

export function weeklyTrend(records: OutbreakRecord[]) {
  const byWeek = groupBy(records, (record) => record.week);

  return [...byWeek.entries()]
    .map(([week, weekRecords]) => ({
      weekStart: week,
      week: formatWeekLabel(week),
      cases: sum(weekRecords, "cases"),
      hospitalizations: sum(weekRecords, "hospitalizations"),
      incidence: Math.round(
        (sum(weekRecords, "cases") / uniquePopulation(weekRecords)) * 100000
      )
    }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

export function regionRisk(records: OutbreakRecord[]) {
  const byRegion = groupBy(records, (record) => record.region);

  return [...byRegion.entries()]
    .map(([region, regionRecords]) => {
      const latest = latestWeekRecords(regionRecords);
      const previous = previousWeekRecords(regionRecords);
      const latestCases = sum(latest, "cases");
      const previousCases = sum(previous, "cases");
      const incidence =
        uniquePopulation(latest) === 0
          ? 0
          : (latestCases / uniquePopulation(latest)) * 100000;
      const growth =
        previousCases === 0 ? 0 : ((latestCases - previousCases) / previousCases) * 100;

      return {
        region: region as Region,
        latestCases,
        incidence: Number(incidence.toFixed(1)),
        growth: Number(growth.toFixed(1)),
        riskScore: Math.round(incidence * 0.65 + Math.max(growth, 0) * 1.8)
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore);
}

export function ageRisk(records: OutbreakRecord[]) {
  const byAge = groupBy(records, (record) => record.ageGroup);

  return [...byAge.entries()]
    .map(([ageGroup, ageRecords]) => {
      const latest = latestWeekRecords(ageRecords);
      const cases = sum(latest, "cases");
      const incidence =
        uniquePopulation(latest) === 0
          ? 0
          : (cases / uniquePopulation(latest)) * 100000;

      return {
        ageGroup: ageGroup as AgeGroup,
        cases,
        incidence: Number(incidence.toFixed(1))
      };
    })
    .sort((a, b) => b.incidence - a.incidence);
}

export function recommendation(records: OutbreakRecord[]) {
  const topRegion = regionRisk(records)[0];
  const topAge = ageRisk(records)[0];

  if (!topRegion || !topAge) {
    return "Not enough data to generate a targeted intervention recommendation.";
  }

  return `Prioritize mobile testing, vaccination outreach, and clinician alerts in ${topRegion.region}, with messaging tailored to the ${topAge.ageGroup} age group.`;
}

function latestWeekRecords(records: OutbreakRecord[]) {
  const latestWeek = [...new Set(records.map((record) => record.week))].sort().at(-1);
  return records.filter((record) => record.week === latestWeek);
}

function previousWeekRecords(records: OutbreakRecord[]) {
  const weeks = [...new Set(records.map((record) => record.week))].sort();
  const previousWeek = weeks.at(-2);
  return records.filter((record) => record.week === previousWeek);
}

function uniquePopulation(records: OutbreakRecord[]) {
  const segments = new Map<string, number>();

  records.forEach((record) => {
    segments.set(`${record.region}-${record.ageGroup}`, record.population);
  });

  return [...segments.values()].reduce((total, population) => total + population, 0);
}

function sum(records: OutbreakRecord[], field: "cases" | "hospitalizations") {
  return records.reduce((total, record) => total + record[field], 0);
}

function groupBy<T, K>(items: T[], getKey: (item: T) => K) {
  return items.reduce((groups, item) => {
    const key = getKey(item);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
    return groups;
  }, new Map<K, T[]>());
}

function formatWeekLabel(week: string) {
  const date = new Date(`${week}T00:00:00`);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
