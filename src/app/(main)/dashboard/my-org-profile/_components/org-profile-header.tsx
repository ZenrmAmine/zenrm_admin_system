"use client";

import { useState } from "react";

import { format, isValid } from "date-fns";
import { Building2, Check, Clock, Copy, CreditCard, RefreshCw, ShieldCheck, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, getInitials } from "@/lib/utils";

import type { ClientOrgRecord } from "./org-profile-types";

interface OrgProfileHeaderProps {
  client: ClientOrgRecord;
  onRefresh: () => Promise<void>;
  isLoading: boolean;
  onEditOnboarding?: () => void;
}

export function OrgProfileHeader({ client, onRefresh, isLoading, onEditOnboarding }: OrgProfileHeaderProps) {
  const [copiedId, setCopiedId] = useState(false);

  const orgName = client.onboarding_data?.clientInformation?.organizationName ?? client.name;
  const einNumber = client.onboarding_data?.clientInformation?.einNumber ?? client.ein_number ?? "12-3456789";
  const usersCount = client.onboarding_data?.users ? client.onboarding_data.users.length : 1;
  const isStripeConnected = Boolean(client.onboarding_data?.bankingLegal?.connected);
  const stripeAccountId =
    client.onboarding_data?.bankingLegal?.stripeAccountId ?? client.stripe_account_id ?? "acct_ready";

  const handleCopyClientId = async () => {
    try {
      await navigator.clipboard.writeText(client.client_id);
      setCopiedId(true);
      toast.success("Client ID copied to clipboard!");
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      toast.error("Failed to copy Client ID.");
    }
  };

  const formatSafeDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return isValid(d) ? format(d, "MMM d, yyyy") : dateStr;
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Hero Organization Card */}
      <div className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-xs sm:p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 rounded-xl border-2 border-border shadow-xs sm:size-18">
              {client.logo_url ? <AvatarImage src={client.logo_url} alt={orgName} /> : null}
              <AvatarFallback className="rounded-xl bg-primary/10 font-bold text-primary text-xl sm:text-2xl">
                {getInitials(orgName)}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-semibold text-2xl tracking-tight sm:text-3xl">{orgName}</h1>
                <Badge
                  variant="outline"
                  className={cn(
                    "gap-1.5 px-2.5 py-0.5 font-medium text-xs capitalize",
                    client.status === "active"
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-amber-500/20 bg-amber-500/10 text-amber-600",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      client.status === "active" ? "bg-emerald-500" : "bg-amber-500",
                    )}
                  />
                  {client.status}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-xs sm:text-sm">
                <button
                  type="button"
                  onClick={handleCopyClientId}
                  className="inline-flex items-center gap-1.5 rounded-md bg-muted/60 px-2 py-0.5 font-mono text-foreground text-xs transition-colors hover:bg-muted"
                  title="Click to copy Client ID"
                >
                  <span>{client.client_id}</span>
                  {copiedId ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                </button>

                <span className="hidden sm:inline">•</span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3.5" /> Updated {formatSafeDate(client.updated_at)}
                </span>
                <span className="hidden sm:inline">•</span>
                <span>Created {formatSafeDate(client.created_at)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void onRefresh()}
              disabled={isLoading}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} />
              {isLoading ? "Refreshing..." : "Refresh"}
            </Button>
            <Button variant="default" size="sm" onClick={onEditOnboarding} className="gap-1.5 text-xs">
              <Sparkles className="size-3.5" />
              <span>Edit Onboarding</span>
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-xs">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">Account Status</p>
              <p className="truncate font-semibold text-sm capitalize">{client.status} Organization</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">Tax ID / EIN</p>
              <p className="truncate font-mono font-semibold text-sm">{einNumber}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <CreditCard className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">Stripe Payouts</p>
              <p className="truncate font-semibold text-sm">
                {isStripeConnected ? "Active & Connected" : stripeAccountId}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Users className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">Configured Team</p>
              <p className="font-semibold text-sm">
                {usersCount} {usersCount === 1 ? "Member" : "Members"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
