"use client";

import { useEffect, useState } from "react";

import { MetricCards } from "./metric-cards";
import { PerformanceOverview } from "./performance-overview";

type DonationDay = {
  date: string;
  amount: number;
};

type DonationAnalytics = {
  totalRevenue: number;
  uniqueDonors: number;
  amountCollectedByDay: DonationDay[];
};

const EMPTY_ANALYTICS: DonationAnalytics = {
  totalRevenue: 0,
  uniqueDonors: 0,
  amountCollectedByDay: [],
};

function normalizeAnalytics(payload: unknown): DonationAnalytics {
  if (typeof payload !== "object" || payload === null) {
    return EMPTY_ANALYTICS;
  }

  const record = payload as Record<string, unknown>;
  const data =
    typeof record.data === "object" && record.data !== null ? (record.data as Record<string, unknown>) : record;

  const totalRevenue = typeof data.totalRevenue === "number" ? data.totalRevenue : Number(data.totalRevenue ?? 0);
  const uniqueDonors = typeof data.uniqueDonors === "number" ? data.uniqueDonors : Number(data.uniqueDonors ?? 0);
  const amountCollectedByDay = Array.isArray(data.amountCollectedByDay)
    ? data.amountCollectedByDay.flatMap((entry) => {
        if (typeof entry !== "object" || entry === null) {
          return [];
        }

        const item = entry as Record<string, unknown>;
        const date = typeof item.date === "string" ? item.date : "";
        const amount = Number(item.amount ?? 0);

        return date ? [{ date, amount }] : [];
      })
    : [];

  return {
    totalRevenue,
    uniqueDonors,
    amountCollectedByDay,
  };
}

export function DonationAnalyticsOverview() {
  const [data, setData] = useState<DonationAnalytics>(EMPTY_ANALYTICS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/zenrm?operation=getDonationAnalytics")
      .then(async (response) => {
        const payload = (await response.json()) as unknown;

        if (!response.ok) {
          const message =
            typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
              ? payload.error
              : "Unable to load donation analytics.";
          throw new Error(message);
        }

        if (isMounted) {
          setData(normalizeAnalytics(payload));
        }
      })
      .catch((error) => {
        console.error("Failed to fetch donation analytics:", error);
        if (isMounted) {
          setData(EMPTY_ANALYTICS);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="h-40 animate-pulse rounded-xl bg-muted" />
          <div className="h-40 animate-pulse rounded-xl bg-muted" />
        </div>
        <div className="h-80 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <MetricCards totalRevenue={data.totalRevenue} uniqueDonors={data.uniqueDonors} />
      <PerformanceOverview data={data.amountCollectedByDay} />
    </div>
  );
}
