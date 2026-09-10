"use client";

import { useState } from "react";

import Link from "next/link";

import {
  AlertCircle,
  Building2,
  Check,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  Key,
  Lock,
  Mail,
  Palette,
  Receipt,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getInitials } from "@/lib/utils";

import { EditOnboardingDialog } from "./edit-onboarding-dialog";
import { OrgProfileHeader } from "./org-profile-header";
import { type ClientOrgRecord, FALLBACK_CLIENT_DATA } from "./org-profile-types";

interface OrgProfileViewProps {
  initialData: ClientOrgRecord;
}

export function OrgProfileView({ initialData }: OrgProfileViewProps) {
  const [clientRecord, setClientRecord] = useState<ClientOrgRecord>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const orgName = clientRecord.onboarding_data?.clientInformation?.organizationName ?? clientRecord.name;
  const adminInfo = clientRecord.onboarding_data?.clientInformation;
  const bankingInfo = clientRecord.onboarding_data?.bankingLegal;
  const teamUsers = clientRecord.onboarding_data?.users ?? FALLBACK_CLIENT_DATA.onboarding_data?.users ?? [];

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(label);
      toast.success(`${label} copied to clipboard!`);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast.error(`Failed to copy ${label}.`);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/zenrm?operation=getClient&clientId=${clientRecord.client_id}`);
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      const data = await res.json();
      if (data && typeof data === "object") {
        setClientRecord((prev) => ({
          ...prev,
          ...data,
          onboarding_data: data.onboarding_data ?? prev.onboarding_data,
        }));
        toast.success("Organization details refreshed!");
      }
    } catch (error) {
      console.error("Refresh error:", error);
      toast.error("Could not refresh data from server. Displaying cached version.");
    } finally {
      setIsLoading(false);
    }
  };

  const palette = [
    {
      label: "Brand Primary",
      color: clientRecord.brand_primary_color ?? "#111111",
      desc: "Primary buttons, headings, and key brand elements",
    },
    {
      label: "Brand Secondary",
      color: clientRecord.brand_secondary_color ?? "#FFFFFF",
      desc: "Backgrounds, card surfaces, and contrasted borders",
    },
    {
      label: "Brand Accent",
      color: clientRecord.brand_accent_color ?? "#0F6E56",
      desc: "Success badges, links, highlighted metrics, and CTA accents",
    },
    {
      label: "Identity Main",
      color: clientRecord.onboarding_data?.organizationIdentity?.mainColor ?? "#c37474",
      desc: "Theme tint from organization onboarding",
    },
    {
      label: "Identity Secondary",
      color: clientRecord.onboarding_data?.organizationIdentity?.secondaryColor ?? "#a61c1c",
      desc: "Secondary accent tone for campaigns and banners",
    },
  ];

  const primaryColor = clientRecord.brand_primary_color ?? "#111111";
  const accentColor = clientRecord.brand_accent_color ?? "#0F6E56";

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Executive Hero & KPI Header */}
      <OrgProfileHeader
        client={clientRecord}
        onRefresh={handleRefresh}
        isLoading={isLoading}
        onEditOnboarding={() => setIsEditDialogOpen(true)}
      />

      {/* Tabs Navigation */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-auto md:grid-cols-4">
          <TabsTrigger value="overview" className="gap-2">
            <Building2 className="size-4" />
            <span>Overview & Branding</span>
          </TabsTrigger>
          <TabsTrigger value="admin" className="gap-2">
            <ShieldCheck className="size-4" />
            <span>Administration & Security</span>
          </TabsTrigger>
          <TabsTrigger value="banking" className="gap-2">
            <CreditCard className="size-4" />
            <span>Banking & Payouts</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="size-4" />
            <span>Team Members ({teamUsers.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview & Identity */}
        <TabsContent value="overview" className="mt-6 flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Legal Information */}
            <Card className="lg:col-span-7">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="size-5 text-primary" />
                  <CardTitle className="text-lg">Legal & Registration Details</CardTitle>
                </div>
                <CardDescription>
                  Verified organizational registration, tax identification, and payment boundaries.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border bg-muted/40 p-3.5">
                    <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Legal Entity Name
                    </p>
                    <p className="mt-1 font-semibold text-foreground text-sm sm:text-base">{orgName}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-3.5">
                    <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Operating Branch Name
                    </p>
                    <p className="mt-1 font-semibold text-foreground text-sm sm:text-base">{clientRecord.name}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-3.5">
                    <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Taxpayer ID (EIN / SSN)
                    </p>
                    <p className="mt-1 font-mono font-semibold text-foreground text-sm">
                      {adminInfo?.einNumber ?? clientRecord.ein_number ?? "12-3456789"}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-3.5">
                    <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      System Client ID
                    </p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="font-medium font-mono text-xs sm:text-sm">{clientRecord.client_id}</span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleCopy(clientRecord.client_id, "Client ID")}
                      >
                        {copiedKey === "Client ID" ? (
                          <Check className="size-3.5 text-emerald-600" />
                        ) : (
                          <Check className="size-3.5 opacity-0" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-3.5">
                    <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Payment Threshold
                    </p>
                    <p className="mt-1 font-semibold text-foreground text-sm">
                      ${clientRecord.payment_threshold.toFixed(2)} USD
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-3.5">
                    <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">Account Status</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="relative flex size-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                      </span>
                      <span className="font-semibold text-foreground text-sm capitalize">{clientRecord.status}</span>
                    </div>
                  </div>
                </div>

                <Separator className="my-2" />

                <div className="flex flex-col gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="size-4 shrink-0 text-primary" />
                    <span className="text-muted-foreground text-xs sm:text-sm">
                      Need to update legal address or EIN document verification?
                    </span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                    Edit Onboarding
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Live Receipt & Branding Preview Mock */}
            <Card className="lg:col-span-5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="size-5 text-primary" />
                    <CardTitle className="text-lg">Live Brand Preview</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Donor Receipt
                  </Badge>
                </div>
                <CardDescription>How your donors experience your organization&apos;s custom branding.</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center pb-6">
                <div
                  className="w-full max-w-sm rounded-2xl border p-5 shadow-sm transition-all duration-300"
                  style={{
                    backgroundColor: "#fafafa",
                    borderColor: primaryColor !== "#FFFFFF" ? `${primaryColor}25` : "#e5e7eb",
                  }}
                >
                  <div className="flex items-center justify-between border-b pb-4">
                    <div>
                      <p className="font-bold text-base" style={{ color: primaryColor }}>
                        {orgName}
                      </p>
                      <p className="text-muted-foreground text-xs">Official Donation Receipt</p>
                    </div>
                    <div
                      className="flex size-9 items-center justify-center rounded-lg font-bold text-white text-xs shadow-xs"
                      style={{ backgroundColor: accentColor }}
                    >
                      {getInitials(orgName)}
                    </div>
                  </div>

                  <div className="my-5 space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Receipt Number:</span>
                      <span className="font-medium font-mono text-foreground">REC-2026-9812</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Tax Status:</span>
                      <span className="font-medium text-emerald-600">501(c)(3) Eligible</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Designation:</span>
                      <span className="font-medium text-foreground">Clean Water Project</span>
                    </div>

                    <div className="mt-4 rounded-lg border bg-background p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-muted-foreground text-xs">Total Gift:</span>
                        <span className="font-bold text-lg" style={{ color: accentColor }}>
                          $150.00 USD
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    className="w-full rounded-xl py-2.5 text-center font-medium text-white text-xs shadow-xs"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Thank You For Your Support
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Color Palette Grid */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="size-5 text-primary" />
                <CardTitle className="text-lg">Configured Color Palette</CardTitle>
              </div>
              <CardDescription>
                Color tokens assigned to your portal, donation checkout, and receipts. Click any color code to copy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {palette.map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-2xs transition-colors hover:border-primary/40"
                  >
                    <button
                      type="button"
                      className="group relative flex h-20 w-full cursor-pointer items-center justify-center rounded-lg border shadow-inner"
                      style={{ backgroundColor: item.color }}
                      onClick={() => handleCopy(item.color, item.label)}
                    >
                      <span className="flex items-center gap-1 rounded bg-black/70 px-2 py-0.5 font-mono text-white text-xs opacity-0 transition-opacity group-hover:opacity-100">
                        <Check className="size-3" /> Copy
                      </span>
                    </button>
                    <div>
                      <p className="font-medium text-foreground text-sm">{item.label}</p>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.color, item.label)}
                        className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-muted-foreground text-xs hover:text-foreground hover:underline"
                      >
                        {item.color}
                        {copiedKey === item.label ? <Check className="size-3 text-emerald-600" /> : null}
                      </button>
                      <p className="mt-1 text-muted-foreground text-xs leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Administration & Security */}
        <TabsContent value="admin" className="mt-6 flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Primary Administrator */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-5 text-primary" />
                  <CardTitle className="text-lg">Primary Administrator</CardTitle>
                </div>
                <CardDescription>
                  Master credentials and identity contact responsible for this organization.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 rounded-xl border bg-muted/30 p-4">
                  <Avatar className="size-12 rounded-lg border">
                    <AvatarFallback className="rounded-lg bg-primary/10 font-bold text-primary">
                      {getInitials(adminInfo?.adminName ?? "Bassam Org")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <p className="font-semibold text-base text-foreground">{adminInfo?.adminName ?? "Bassam Org"}</p>
                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                      <Mail className="size-3.5" />
                      <span>{adminInfo?.adminEmail ?? "Bassam@org.com"}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2.5">
                      <Lock className="size-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Account Password</span>
                    </div>
                    <Badge variant={adminInfo?.passwordIsSet ? "default" : "secondary"}>
                      {adminInfo?.passwordIsSet ? "Configured & Secure" : "Pending Setup"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2.5">
                      <UserCheck className="size-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Role Authority</span>
                    </div>
                    <Badge variant="outline">Organization SuperAdmin</Badge>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="size-4 text-emerald-600" />
                      <span className="font-medium text-sm">Access Control (RBAC)</span>
                    </div>
                    <span className="font-medium text-emerald-600 text-xs">Full Permissions</span>
                  </div>
                </div>

                <Button variant="outline" className="w-full" asChild>
                  <Link href="/dashboard/users">
                    <Users className="mr-2 size-4" />
                    Manage Administrators in Users Module
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* CRM & Connectivity */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Key className="size-5 text-primary" />
                  <CardTitle className="text-lg">System Integrations & CRM</CardTitle>
                </div>
                <CardDescription>CRM synchronizations, external databases, and enterprise data pipes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 rounded-xl border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">CRM Provider</p>
                      <p className="text-muted-foreground text-xs">Integrated donor database</p>
                    </div>
                    <Badge variant={clientRecord.crm_provider ? "default" : "secondary"}>
                      {clientRecord.crm_provider ?? "Native ZenRM CRM"}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">Webhook Delivery</p>
                      <p className="text-muted-foreground text-xs">Automated donation event notifications</p>
                    </div>
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-600">
                      Active
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">Data Version</p>
                      <p className="text-muted-foreground text-xs">Schema engine compatibility</p>
                    </div>
                    <span className="font-mono text-muted-foreground text-xs">v2.4-enterprise</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600" />
                  <div className="space-y-1 text-xs">
                    <p className="font-semibold text-amber-900 dark:text-amber-200">
                      Need custom Salesforce or Virtuous CRM sync?
                    </p>
                    <p className="text-muted-foreground">
                      Contact support to enable two-way donor data syncing for enterprise CRM providers.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 3: Banking & Payouts */}
        <TabsContent value="banking" className="mt-6 flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Stripe Merchant Details */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="size-5 text-primary" />
                    <CardTitle className="text-lg">Stripe Connect Payouts</CardTitle>
                  </div>
                  <Badge
                    variant={bankingInfo?.connected ? "default" : "outline"}
                    className={bankingInfo?.connected ? "bg-emerald-600" : "border-amber-300 text-amber-600"}
                  >
                    {bankingInfo?.connected ? "Ready For Payouts" : "Account Connected"}
                  </Badge>
                </div>
                <CardDescription>
                  Merchant account processing daily donation deposits directly to your bank.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="rounded-lg border bg-muted/30 p-3.5">
                    <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Stripe Merchant Account ID
                    </p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="font-medium font-mono text-foreground text-sm">
                        {bankingInfo?.stripeAccountId ?? clientRecord.stripe_account_id ?? "acct_1TtzE9FGjEzyTWs3"}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() =>
                          handleCopy(
                            bankingInfo?.stripeAccountId ?? clientRecord.stripe_account_id ?? "acct_1TtzE9FGjEzyTWs3",
                            "Stripe Account ID",
                          )
                        }
                      >
                        {copiedKey === "Stripe Account ID" ? (
                          <Check className="size-3.5 text-emerald-600" />
                        ) : (
                          <Check className="size-3.5 opacity-0" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-muted-foreground text-xs">Payout Schedule</p>
                      <p className="mt-0.5 font-semibold text-sm">Daily Rolling</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-muted-foreground text-xs">Settlement Currency</p>
                      <p className="mt-0.5 font-semibold text-sm">USD ($)</p>
                    </div>
                  </div>
                </div>

                <Button variant="outline" className="w-full justify-between" asChild>
                  <a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer">
                    <span>View Stripe Express Dashboard</span>
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Client Secret & API Access */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Key className="size-5 text-primary" />
                  <CardTitle className="text-lg">Client API Secret</CardTitle>
                </div>
                <CardDescription>
                  Authenticate SDK and backend integrations with your unique organization secret.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Live Secret Key
                    </span>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setShowSecret((prev) => !prev)}
                      className="h-7 text-xs"
                    >
                      {showSecret ? (
                        <>
                          <EyeOff className="mr-1.5 size-3.5" />
                          Hide Secret
                        </>
                      ) : (
                        <>
                          <Eye className="mr-1.5 size-3.5" />
                          Reveal Secret
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                    <span className="break-all font-mono text-xs">
                      {showSecret
                        ? (clientRecord.client_secret ?? "accs_secret__VCMYzz52TOCFXfpG9FXzrwS7aIkMuWCiBBHpSuoMFweTVv4")
                        : "accs_secret••••••••••••••••••••••••••••••••••••••••••••"}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="ml-2 shrink-0"
                      onClick={() =>
                        handleCopy(
                          clientRecord.client_secret ?? "accs_secret__VCMYzz52TOCFXfpG9FXzrwS7aIkMuWCiBBHpSuoMFweTVv4",
                          "Client Secret",
                        )
                      }
                    >
                      {copiedKey === "Client Secret" ? (
                        <Check className="size-3.5 text-emerald-600" />
                      ) : (
                        <Check className="size-3.5 opacity-0" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3.5">
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600" />
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    <strong className="text-red-900 dark:text-red-200">Security Warning:</strong> Treat this secret key
                    like a password. Never commit it to git repositories or expose it in client-side code.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 4: Team Members */}
        <TabsContent value="team" className="mt-6 flex flex-col gap-6">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="size-5 text-primary" />
                  <CardTitle className="text-lg">Configured Team Members</CardTitle>
                </div>
                <CardDescription>Authorized staff members and employees registered under {orgName}.</CardDescription>
              </div>
              <Button asChild>
                <Link href="/dashboard/users">
                  <Users className="mr-2 size-4" />
                  Manage in Users Module
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {teamUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-start justify-between rounded-xl border bg-card p-4 shadow-2xs transition-colors hover:border-primary/40"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="size-11 rounded-lg border">
                        <AvatarFallback className="rounded-lg bg-primary/10 font-bold text-primary text-sm">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground text-sm">{user.name}</p>
                        <p className="text-muted-foreground text-xs">{user.email}</p>
                        <div className="flex items-center gap-1.5 pt-1">
                          <Badge variant="secondary" className="text-xs capitalize">
                            {user.profile}
                          </Badge>
                          {user.passwordIsSet ? (
                            <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 text-xs">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-500/30 text-amber-600 text-xs">
                              Pending
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Onboarding Modal */}
      <EditOnboardingDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        client={clientRecord}
        onSaveSuccess={(updated) => setClientRecord(updated)}
      />
    </div>
  );
}
