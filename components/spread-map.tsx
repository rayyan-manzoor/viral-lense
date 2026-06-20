"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { SpreadMapClient } from "@/components/spread-map-client";

const DynamicSpreadMap = dynamic(
  () =>
    import("@/components/spread-map-client").then((m) => m.SpreadMapClient),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
          borderRadius: "inherit",
          color: "#64748b"
        }}
      >
        Loading map…
      </div>
    )
  }
);

export function SpreadMap(props: ComponentProps<typeof SpreadMapClient>) {
  return <DynamicSpreadMap {...props} />;
}
