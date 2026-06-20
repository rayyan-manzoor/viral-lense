import type { AgeGroup, Disease, OutbreakRecord, Region } from "@/lib/types";

export const diseases: Disease[] = [
  "Nova Flu",
  "Measles Resurgence",
  "Norovirus Cluster"
];

export const regions: Region[] = [
  "North Metro",
  "Lake County",
  "River Valley",
  "South Plains",
  "Coastal Bend"
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

const regionPopulations: Record<Region, number> = {
  "North Metro": 780000,
  "Lake County": 340000,
  "River Valley": 215000,
  "South Plains": 185000,
  "Coastal Bend": 420000
};

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
      "North Metro": 1.35,
      "Lake County": 0.9,
      "River Valley": 1.05,
      "South Plains": 0.78,
      "Coastal Bend": 1.18
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
      "North Metro": 1.15,
      "Lake County": 1.42,
      "River Valley": 0.84,
      "South Plains": 1.22,
      "Coastal Bend": 0.68
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
      "North Metro": 0.95,
      "Lake County": 0.82,
      "River Valley": 1.52,
      "South Plains": 0.72,
      "Coastal Bend": 1.18
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
              regionalNoise
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
