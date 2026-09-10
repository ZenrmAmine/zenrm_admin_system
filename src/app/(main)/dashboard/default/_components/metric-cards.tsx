import { DollarSign, TrendingUp, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function MetricCards({
  totalRevenue,
  uniqueDonors,
}: {
  readonly totalRevenue: number;
  readonly uniqueDonors: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs xl:grid-cols-2 dark:*:data-[slot=card]:bg-card">
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
              <DollarSign className="size-4" />
            </div>
          </CardTitle>
          <CardDescription>Total Revenue</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
              ${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <Badge>
              <TrendingUp className="size-3" />
              Total
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">Collected across all donations</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
              <UserPlus className="size-4" />
            </div>
          </CardTitle>
          <CardDescription>Unique Donors</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
              {uniqueDonors.toLocaleString("en-US")}
            </div>
            <Badge>
              <TrendingUp className="size-3" />
              Donors
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">Active supporters in the current donation set</p>
        </CardContent>
      </Card>
    </div>
  );
}
