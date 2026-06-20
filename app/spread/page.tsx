import { SpreadExplorer } from "@/components/spread-explorer";

export const metadata = {
  title: "Viral Lense | Geographic Spread Explorer",
  description:
    "Visualize disease case data on an interactive map and animate the spread over time."
};

export default function SpreadPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10">
      <SpreadExplorer />
    </main>
  );
}
