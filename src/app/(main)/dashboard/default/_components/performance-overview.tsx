"use client";

import { format, parse, parseISO } from "date-fns";
import { Area, CartesianGrid, ComposedChart, XAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const chartConfig = {
  amount: {
    label: "Donation Amount",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

function formatDonationDate(value: string | number | null | undefined) {
  if (value == null) return "";

  const rawValue = String(value).trim();
  if (!rawValue) return "";

  const isoDate = parseISO(rawValue);
  if (!Number.isNaN(isoDate.getTime())) {
    return format(isoDate, "d MMMM yyyy");
  }

  const shortDate = parse(rawValue, "EEE MMM d", new Date());
  if (!Number.isNaN(shortDate.getTime())) {
    return format(shortDate, "d MMMM yyyy");
  }

  const fallbackDate = new Date(rawValue);
  if (!Number.isNaN(fallbackDate.getTime())) {
    return format(fallbackDate, "d MMMM yyyy");
  }

  return rawValue;
}

export function PerformanceOverview({ data }: { readonly data: ReadonlyArray<{ date: string; amount: number }> }) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle className="leading-none">Donation Activity</CardTitle>
        <CardDescription>
          <span className="@[540px]/card:block hidden">Amount collected by day</span>
          <span className="@[540px]/card:hidden">By day</span>
        </CardDescription>
      </CardHeader>

      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-80 w-full">
          <ComposedChart data={data} margin={{ top: 0 }}>
            <defs>
              <linearGradient id="fillDonationAmount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-amount)" stopOpacity={0.36} />
                <stop offset="95%" stopColor="var(--color-amount)" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeOpacity={0.5} />

            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={40}
              tickFormatter={(value) => formatDonationDate(value)}
            />

            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  className="w-50"
                  indicator="line"
                  labelFormatter={(value) => formatDonationDate(value as string | number | null | undefined)}
                />
              }
            />

            <Area
              dataKey="amount"
              type="natural"
              fill="url(#fillDonationAmount)"
              stroke="var(--color-amount)"
              strokeWidth={1.25}
              dot={false}
              fillOpacity={1}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
