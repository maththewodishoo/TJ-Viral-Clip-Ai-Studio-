import { useMemo, useState } from "react";
import { HeroBanner } from "@/components/dashboard/HeroBanner";
import { UrlAnalyzer } from "@/components/dashboard/UrlAnalyzer";
import { StatsRow } from "@/components/dashboard/StatsRow";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { ApiSetupPanel } from "@/components/dashboard/ApiSetupPanel";
import { RecentProjects } from "@/components/dashboard/RecentProjects";
import { TrendingTopics } from "@/components/dashboard/TrendingTopics";
import { SystemStatus } from "@/components/dashboard/SystemStatus";
import { PromoCard } from "@/components/dashboard/PromoCard";
import { useWorkspace } from "@/lib/store";
import { buildSeries, hasSeriesData, type Range } from "@/lib/stats";

export default function Overview() {
  const ws = useWorkspace();
  const [range, setRange] = useState<Range>("7D");
  const series = useMemo(() => buildSeries(ws, range), [ws, range]);

  return (
    <div className="space-y-3">
      <HeroBanner />
      <UrlAnalyzer />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_286px]">
        <div className="min-w-0 space-y-3">
          <StatsRow ws={ws} />
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <PerformanceChart points={series} range={range} onRange={setRange} hasData={hasSeriesData(series)} />
            <QuickActions />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <RecentProjects />
            <TrendingTopics />
            <div className="sm:col-span-2 xl:col-span-1">
              <SystemStatus />
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <ApiSetupPanel />
          <PromoCard />
        </div>
      </div>
    </div>
  );
}
