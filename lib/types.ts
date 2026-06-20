export type Region =
  | "North Metro"
  | "Lake County"
  | "River Valley"
  | "South Plains"
  | "Coastal Bend";

export type AgeGroup = "0-17" | "18-34" | "35-49" | "50-64" | "65+";

export type Disease = "Nova Flu" | "Measles Resurgence" | "Norovirus Cluster";

export type OutbreakRecord = {
  week: string;
  disease: Disease;
  region: Region;
  ageGroup: AgeGroup;
  cases: number;
  hospitalizations: number;
  population: number;
};

export type DashboardFilters = {
  disease: Disease;
  region: Region | "All Regions";
  ageGroup: AgeGroup | "All Ages";
};

export type MetricCard = {
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "teal" | "orange" | "rose";
};
