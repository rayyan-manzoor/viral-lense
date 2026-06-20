"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { SpreadGlobeClient } from "@/components/spread-globe-client";

const DynamicSpreadMap = dynamic(
  () =>
    import("@/components/spread-globe-client").then((m) => m.SpreadGlobeClient),
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
        Loading globe…
      </div>
    )
  }
);

export function SpreadMap(props: ComponentProps<typeof SpreadGlobeClient>) {
  return <DynamicSpreadMap {...props} />;
}
