# Viral Lense

Viral Lense is a public-health outbreak analytics dashboard that tracks simulated disease spread by region and age group. It is designed as a resume-ready project that combines domain modeling, data visualization, epidemiology metrics, and a polished product interface.

## Why This Project Stands Out

- Models outbreak surveillance data across diseases, regions, age groups, weekly case counts, hospitalizations, and population segments.
- Calculates practical epidemiology metrics including incidence per 100,000 residents, weekly growth rate, hospitalization rate, and regional risk scores.
- Turns raw surveillance data into decision support with a targeted containment recommendation.
- Uses a modern TypeScript stack with reusable analytics functions, typed data models, componentized UI, and unit tests.

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Recharts
- Vitest

## Features

- Interactive filters for disease, region, and age group.
- KPI cards for latest weekly cases, incidence, hospitalization rate, and cumulative cases.
- Trend chart comparing weekly cases and hospitalizations.
- Age-group incidence chart to identify vulnerable populations.
- Regional risk queue for prioritizing public-health response.
- Recommendation panel that summarizes where interventions should be focused.

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
- Add geospatial map layers for county-level outbreak visualization.
- Add forecasting models for short-term case projections.
- Add authentication and saved outbreak reports for health operations teams.
- Add API routes for uploading CSV surveillance data.

## Data Disclaimer

The current dataset is synthetic and intended for software demonstration only. It should not be used for clinical, public-health, or emergency decision-making.
