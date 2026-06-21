import type { AgeGroup, Disease, OutbreakRecord, Region } from "@/lib/types";

export const diseases: Disease[] = [
  "Nova Flu",
  "Measles Resurgence",
  "Norovirus Cluster"
];

export const regions: Region[] = [
  "North America",
  "South America",
  "Europe",
  "Africa",
  "Asia",
  "Oceania"
];

export const ageGroups: AgeGroup[] = ["0-17", "18-34", "35-49", "50-64", "65+"];

const weeks = [
  "2026-02-01",
  "2026-02-08",
  "2026-02-15",
  "2026-02-22",
  "2026-03-01",
  "2026-03-08",
  "2026-03-15",
  "2026-03-22"
];

// Representative monitored-cohort populations per continent. Kept in a tight
// band (not true continental totals) so per-capita metrics stay readable while
// the labels give a holistic, global view.
const regionPopulations: Record<Region, number> = {
  "North America": 480000000,
  "South America": 400000000,
  Europe: 560000000,
  Africa: 640000000,
  Asia: 800000000,
  Oceania: 240000000
};

// Scales the synthetic case generator up to continental magnitudes. Because
// hospitalizations and population scale by the same factor, incidence and
// hospitalization-rate ratios are unchanged.
const CASE_SCALE = 1600;

const agePopulationShare: Record<AgeGroup, number> = {
  "0-17": 0.22,
  "18-34": 0.27,
  "35-49": 0.2,
  "50-64": 0.18,
  "65+": 0.13
};

const diseaseProfiles: Record<
  Disease,
  {
    base: number;
    growth: number;
    hospitalizationRate: number;
    ageRisk: Record<AgeGroup, number>;
    regionalPressure: Record<Region, number>;
  }
> = {
  "Nova Flu": {
    base: 28,
    growth: 1.22,
    hospitalizationRate: 0.045,
    ageRisk: {
      "0-17": 0.85,
      "18-34": 0.95,
      "35-49": 1.05,
      "50-64": 1.22,
      "65+": 1.65
    },
    regionalPressure: {
      "North America": 1.3,
      "South America": 0.95,
      Europe: 1.32,
      Africa: 0.82,
      Asia: 1.35,
      Oceania: 0.7
    }
  },
  "Measles Resurgence": {
    base: 9,
    growth: 1.33,
    hospitalizationRate: 0.11,
    ageRisk: {
      "0-17": 1.75,
      "18-34": 1.0,
      "35-49": 0.72,
      "50-64": 0.55,
      "65+": 0.42
    },
    regionalPressure: {
      "North America": 1.0,
      "South America": 1.2,
      Europe: 1.1,
      Africa: 1.45,
      Asia: 1.25,
      Oceania: 0.6
    }
  },
  "Norovirus Cluster": {
    base: 42,
    growth: 1.08,
    hospitalizationRate: 0.026,
    ageRisk: {
      "0-17": 1.2,
      "18-34": 0.76,
      "35-49": 0.88,
      "50-64": 1.05,
      "65+": 1.58
    },
    regionalPressure: {
      "North America": 1.1,
      "South America": 0.9,
      Europe: 1.2,
      Africa: 1.0,
      Asia: 1.3,
      Oceania: 0.8
    }
  }
};

export const outbreakRecords: OutbreakRecord[] = diseases.flatMap((disease) => {
  const profile = diseaseProfiles[disease];

  return weeks.flatMap((week, weekIndex) =>
    regions.flatMap((region, regionIndex) =>
      ageGroups.map((ageGroup, ageIndex) => {
        const population = Math.round(
          regionPopulations[region] * agePopulationShare[ageGroup]
        );
        const periodicSignal = 1 + Math.sin((weekIndex + ageIndex) / 2) * 0.08;
        const regionalNoise = 1 + ((regionIndex - 2) * 0.035);
        const cases = Math.max(
          1,
          Math.round(
            profile.base *
              Math.pow(profile.growth, weekIndex) *
              profile.regionalPressure[region] *
              profile.ageRisk[ageGroup] *
              periodicSignal *
              regionalNoise *
              CASE_SCALE
          )
        );

        return {
          week,
          disease,
          region,
          ageGroup,
          cases,
          hospitalizations: Math.round(cases * profile.hospitalizationRate),
          population
        };
      })
    )
  );
});
