export type GeoPoint = {
  lat: number;
  lng: number;
};

export type CaseEntry = {
  id: string;
  date: string;
  location: string;
  country: string;
  coords: GeoPoint;
  confirmed: number;
  deaths: number;
  recovered: number;
  /** People per square kilometer at this location. Drives density analysis. */
  populationDensity?: number;
  notes?: string;
};

export type SpreadDataset = {
  id: string;
  name: string;
  pathogen: string;
  firstDetected: string;
  description: string;
  /** Hex accent color used for this outbreak category across the UI. */
  color: string;
  entries: CaseEntry[];
};

export type TimelineFrame = {
  date: string;
  entries: CaseEntry[];
  cumulativeByLocation: Record<
    string,
    { confirmed: number; deaths: number; recovered: number }
  >;
};

export type DensityTier = {
  label: string;
  /** Inclusive lower bound, people per km². */
  min: number;
  color: string;
};
