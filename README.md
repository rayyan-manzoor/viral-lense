# Viral Lense

Viral Lense is a public-health outbreak analytics dashboard that tracks simulated disease spread by region and age group. It is designed as a resume-ready project that combines domain modeling, data visualization, epidemiology metrics, and a polished product interface.

## Why This Project Stands Out

- Models outbreak surveillance data across diseases, regions, age groups, weekly case counts, hospitalizations, and population segments.
- Calculates practical epidemiology metrics including incidence per 100,000 residents, weekly growth rate, hospitalization rate, and regional risk scores.
- Animates the geographic spread of an outbreak over time on an interactive world map.
- Turns raw surveillance data into decision support with a targeted containment recommendation.
- Uses a modern TypeScript stack with reusable analytics functions, typed data models, componentized UI, and unit tests.

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Recharts
- Leaflet / react-leaflet (interactive maps)
- SheetJS (xlsx) for spreadsheet import
- Vitest

## Features

- Interactive filters for disease, region, and age group.
- KPI cards for latest weekly cases, incidence, hospitalization rate, and cumulative cases.
- Trend chart comparing weekly cases and hospitalizations.
- Age-group incidence chart to identify vulnerable populations.
- Regional risk queue for prioritizing public-health response.
- Recommendation panel that summarizes where interventions should be focused.

### Geographic Spread Explorer (`/spread`)

- Interactive world map (Leaflet) that plots confirmed-case locations as scaled, color-coded markers.
- Timeline player with play/pause, scrubbing, and restart to animate how an outbreak spreads day by day — ships with a reconstructed COVID-19 early-spread dataset (Dec 2019 – Feb 2020).
- Population-density visualization mode to compare transmission in dense urban hubs vs. lower-density areas, plus a live "density signal" panel showing the share of cases in high- vs. low-density places.
- Add your own data: manual single-record entry, paste CSV, or upload an Excel/CSV file (`.xlsx`, `.xls`, `.csv`) with header-based column matching.
- Create new outbreak categories on the fly for future or hypothetical outbreaks, each tracked on its own timeline with its own accent color.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

Build for production:

```bash
npm run build
```

## Resume Positioning

Suggested resume bullet:

> Built Viral Lense, a TypeScript/Next.js disease outbreak analytics dashboard that models simulated public-health surveillance data, calculates epidemiology metrics across regions and age groups, and visualizes risk trends for targeted intervention planning.

## Future Enhancements

- Integrate public datasets from CDC, WHO, or state health departments.
- Add choropleth county/region density layers behind the case markers.
- Add forecasting models for short-term case projections.
- Add authentication and saved outbreak reports for health operations teams.
- Persist user-imported datasets and categories to a backend.

## Data Disclaimer

The current dataset is synthetic and intended for software demonstration only. It should not be used for clinical, public-health, or emergency decision-making.
