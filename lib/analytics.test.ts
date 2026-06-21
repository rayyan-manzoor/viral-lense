import { describe, expect, it } from "vitest";
import {
  ageRisk,
  filterRecords,
  regionRisk,
  summarizeMetrics,
  weeklyTrend
} from "./analytics";
import { outbreakRecords } from "./outbreak-data";

describe("outbreak analytics", () => {
  it("filters records by disease, region, and age group", () => {
    const records = filterRecords(outbreakRecords, {
      disease: "Measles Resurgence",
      region: "Europe",
      ageGroup: "0-17"
    });

    expect(records.length).toBeGreaterThan(0);
    expect(records.every((record) => record.disease === "Measles Resurgence")).toBe(
      true
    );
    expect(records.every((record) => record.region === "Europe")).toBe(true);
    expect(records.every((record) => record.ageGroup === "0-17")).toBe(true);
  });

  it("produces high-level metrics for the selected outbreak", () => {
    const records = filterRecords(outbreakRecords, {
      disease: "Nova Flu",
      region: "All Regions",
      ageGroup: "All Ages"
    });

    const metrics = summarizeMetrics(records);

    expect(metrics).toHaveLength(4);
    expect(metrics[0].label).toBe("Latest weekly cases");
    expect(metrics.every((metric) => metric.value.length > 0)).toBe(true);
  });

  it("sorts regional risk from highest to lowest score", () => {
    const records = filterRecords(outbreakRecords, {
      disease: "Norovirus Cluster",
      region: "All Regions",
      ageGroup: "All Ages"
    });

    const risks = regionRisk(records);

    expect(risks).toHaveLength(6);
    expect(risks[0].riskScore).toBeGreaterThanOrEqual(risks.at(-1)?.riskScore ?? 0);
  });

  it("creates weekly and age-group series for visualization", () => {
    const records = filterRecords(outbreakRecords, {
      disease: "Nova Flu",
      region: "North America",
      ageGroup: "All Ages"
    });

    expect(weeklyTrend(records)).toHaveLength(8);
    expect(ageRisk(records)).toHaveLength(5);
  });
});
