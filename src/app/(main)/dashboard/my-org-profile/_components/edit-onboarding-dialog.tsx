"use client";

import { useEffect, useState } from "react";

import { Building2, CreditCard, Loader2, Palette, Plus, ShieldCheck, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { ClientOrgRecord, OnboardingUser } from "./org-profile-types";

interface EditOnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientOrgRecord;
  onSaveSuccess: (updated: ClientOrgRecord) => void;
}

export function EditOnboardingDialog({ open, onOpenChange, client, onSaveSuccess }: EditOnboardingDialogProps) {
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [organizationName, setOrganizationName] = useState("");
  const [einNumber, setEinNumber] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [passwordIsSet, setPasswordIsSet] = useState(true);

  const [mainColor, setMainColor] = useState("#028083");
  const [secondaryColor, setSecondaryColor] = useState("#ac86b6");

  const [stripeAccountId, setStripeAccountId] = useState("");
  const [bankingConnected, setBankingConnected] = useState(false);

  const [users, setUsers] = useState<OnboardingUser[]>([]);

  // Sync state with client prop when modal opens
  useEffect(() => {
    if (!open) return;

    const info = client.onboarding_data?.clientInformation;
    setOrganizationName(info?.organizationName ?? client.name);
    setEinNumber(info?.einNumber ?? client.ein_number ?? "");
    setAdminName(info?.adminName ?? "");
    setAdminEmail(info?.adminEmail ?? "");
    setPasswordIsSet(info?.passwordIsSet ?? true);

    const identity = client.onboarding_data?.organizationIdentity;
    setMainColor(identity?.mainColor ?? client.brand_primary_color ?? "#028083");
    setSecondaryColor(identity?.secondaryColor ?? client.brand_accent_color ?? "#ac86b6");

    const banking = client.onboarding_data?.bankingLegal;
    setStripeAccountId(banking?.stripeAccountId ?? client.stripe_account_id ?? "");
    setBankingConnected(Boolean(banking?.connected));

    const onboardingUsers = client.onboarding_data?.users ?? [];
    setUsers(
      onboardingUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        profile: u.profile ?? "employee",
        expirationDate: u.expirationDate ?? "",
        passwordIsSet: u.passwordIsSet ?? true,
      })),
    );
  }, [open, client]);

  // User list manipulation
  const handleAddUser = () => {
    const newUser: OnboardingUser = {
      id: crypto.randomUUID(),
      name: "",
      email: "",
      profile: "employee",
      expirationDate: "",
      passwordIsSet: true,
    };
    setUsers((prev) => [...prev, newUser]);
  };

  const handleRemoveUser = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleUpdateUser = (userId: string, field: keyof OnboardingUser, value: string | boolean) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, [field]: value } : u)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const payload = {
      clientInformation: {
        organizationName: organizationName.trim(),
        einNumber: einNumber.trim(),
        adminName: adminName.trim(),
        adminEmail: adminEmail.trim(),
        passwordIsSet,
      },
      organizationIdentity: {
        mainColor: mainColor.trim(),
        secondaryColor: secondaryColor.trim(),
      },
      users: users.map((u) => ({
        id: u.id || crypto.randomUUID(),
        name: u.name.trim(),
        email: u.email.trim(),
        profile: u.profile.trim() || "employee",
        expirationDate: u.expirationDate ?? "",
        passwordIsSet: Boolean(u.passwordIsSet),
      })),
      bankingLegal: {
        connected: bankingConnected,
        stripeAccountId: stripeAccountId.trim(),
      },
    };

    try {
      const response = await fetch("/api/zenrm", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "updateOnboardingData",
          clientId: client.client_id,
          payload,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error ?? `Request failed with status ${response.status}`);
      }

      const responseData = await response.json().catch(() => null);

      toast.success("Organization onboarding data updated successfully!");

      const updatedRecord: ClientOrgRecord = {
        ...client,
        name: payload.clientInformation.organizationName || client.name,
        ein_number: payload.clientInformation.einNumber || client.ein_number,
        stripe_account_id: payload.bankingLegal.stripeAccountId || client.stripe_account_id,
        onboarding_data: {
          ...client.onboarding_data,
          ...payload,
          ...(responseData?.onboarding_data ?? {}),
        },
      };

      onSaveSuccess(updatedRecord);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update onboarding data:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update onboarding data. Please check connection.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b p-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Building2 className="size-5 text-primary" />
            Edit Onboarding Data
          </DialogTitle>
          <DialogDescription>
            Update client registration, organization identity styling, banking credentials, and team users.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <Tabs defaultValue="clientInfo" className="flex flex-1 flex-col overflow-hidden">
            <div className="border-b bg-muted/20 px-6 pt-3">
              <TabsList className="grid h-9 w-full grid-cols-4">
                <TabsTrigger value="clientInfo" className="gap-1.5 text-xs sm:text-sm">
                  <ShieldCheck className="size-3.5 sm:size-4" />
                  <span className="truncate">Client Info</span>
                </TabsTrigger>
                <TabsTrigger value="identity" className="gap-1.5 text-xs sm:text-sm">
                  <Palette className="size-3.5 sm:size-4" />
                  <span className="truncate">Identity</span>
                </TabsTrigger>
                <TabsTrigger value="banking" className="gap-1.5 text-xs sm:text-sm">
                  <CreditCard className="size-3.5 sm:size-4" />
                  <span className="truncate">Banking</span>
                </TabsTrigger>
                <TabsTrigger value="users" className="gap-1.5 text-xs sm:text-sm">
                  <Users className="size-3.5 sm:size-4" />
                  <span className="truncate">Team ({users.length})</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              {/* Tab 1: Client Info & Admin */}
              <TabsContent value="clientInfo" className="m-0 space-y-4">
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground text-sm">Organization Details</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="orgName">Organization Name *</Label>
                      <Input
                        id="orgName"
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        placeholder="e.g. MWL Test"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ein">EIN / Tax ID *</Label>
                      <Input
                        id="ein"
                        value={einNumber}
                        onChange={(e) => setEinNumber(e.target.value)}
                        placeholder="e.g. 12-3456872"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 border-t pt-3">
                  <h4 className="font-semibold text-foreground text-sm">Primary Administrator Account</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="adminName">Admin Full Name *</Label>
                      <Input
                        id="adminName"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        placeholder="e.g. Tester1"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="adminEmail">Admin Email *</Label>
                      <Input
                        id="adminEmail"
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="e.g. tester1@mwltest.org"
                        required
                      />
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between rounded-lg border bg-muted/20 p-3.5">
                    <div className="space-y-0.5">
                      <Label htmlFor="passwordSetSwitch" className="cursor-pointer font-medium text-sm">
                        Password Configured
                      </Label>
                      <p className="text-muted-foreground text-xs">
                        Marks whether the primary admin credentials have been set up and validated.
                      </p>
                    </div>
                    <Switch id="passwordSetSwitch" checked={passwordIsSet} onCheckedChange={setPasswordIsSet} />
                  </div>
                </div>
              </TabsContent>

              {/* Tab 2: Organization Identity & Colors */}
              <TabsContent value="identity" className="m-0 space-y-5">
                <div>
                  <h4 className="font-semibold text-foreground text-sm">Brand Color Identity</h4>
                  <p className="mt-0.5 text-muted-foreground text-xs">
                    Configure the main and secondary colors used in donor checkouts, receipts, and public portals.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {/* Main Color */}
                  <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="mainColor" className="font-semibold text-sm">
                        Main Brand Color
                      </Label>
                      <div className="size-7 rounded-md border shadow-xs" style={{ backgroundColor: mainColor }} />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id="mainColorPicker"
                        value={mainColor.startsWith("#") && mainColor.length === 7 ? mainColor : "#028083"}
                        onChange={(e) => setMainColor(e.target.value)}
                        className="size-9 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
                      />
                      <Input
                        id="mainColor"
                        value={mainColor}
                        onChange={(e) => setMainColor(e.target.value)}
                        placeholder="#028083"
                        className="font-mono text-sm"
                      />
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Used for prominent brand buttons, headers, and receipt badges.
                    </p>
                  </div>

                  {/* Secondary Color */}
                  <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="secondaryColor" className="font-semibold text-sm">
                        Secondary Accent Color
                      </Label>
                      <div className="size-7 rounded-md border shadow-xs" style={{ backgroundColor: secondaryColor }} />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id="secondaryColorPicker"
                        value={
                          secondaryColor.startsWith("#") && secondaryColor.length === 7 ? secondaryColor : "#ac86b6"
                        }
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="size-9 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
                      />
                      <Input
                        id="secondaryColor"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        placeholder="#ac86b6"
                        className="font-mono text-sm"
                      />
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Used for highlights, tags, campaign sub-banners, and secondary links.
                    </p>
                  </div>
                </div>

                {/* Preview Card */}
                <div className="space-y-3 rounded-xl border bg-card p-4 shadow-2xs">
                  <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    Live Contrast Preview
                  </span>
                  <div className="flex items-center gap-3">
                    <div
                      className="rounded-lg px-4 py-2 font-medium text-sm text-white shadow-xs"
                      style={{ backgroundColor: mainColor }}
                    >
                      Main Accent CTA
                    </div>
                    <div
                      className="rounded-lg px-4 py-2 font-medium text-sm text-white shadow-xs"
                      style={{ backgroundColor: secondaryColor }}
                    >
                      Secondary Tag
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Tab 3: Banking & Legal */}
              <TabsContent value="banking" className="m-0 space-y-5">
                <div>
                  <h4 className="font-semibold text-foreground text-sm">Stripe Merchant & Payouts</h4>
                  <p className="mt-0.5 text-muted-foreground text-xs">
                    Manage the Stripe Express connected account receiving direct donor payouts.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="stripeAccountId">Stripe Account ID</Label>
                    <Input
                      id="stripeAccountId"
                      value={stripeAccountId}
                      onChange={(e) => setStripeAccountId(e.target.value)}
                      placeholder="e.g. acct_1UABnjFAwcMpM15C"
                      className="font-mono text-sm"
                    />
                    <p className="text-muted-foreground text-xs">
                      The Stripe Connect Custom or Express ID linked to your bank account.
                    </p>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3.5">
                    <div className="space-y-0.5">
                      <Label htmlFor="bankingConnectedSwitch" className="cursor-pointer font-medium text-sm">
                        Account Connection Status
                      </Label>
                      <p className="text-muted-foreground text-xs">
                        Toggle to active once onboarding documents on Stripe have passed verification.
                      </p>
                    </div>
                    <Switch
                      id="bankingConnectedSwitch"
                      checked={bankingConnected}
                      onCheckedChange={setBankingConnected}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Tab 4: Team Users */}
              <TabsContent value="users" className="m-0 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-foreground text-sm">Onboarding Team Members</h4>
                    <p className="text-muted-foreground text-xs">
                      Configure employee and staff accounts provisioned for this client.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddUser} className="gap-1.5">
                    <Plus className="size-3.5" />
                    <span>Add Member</span>
                  </Button>
                </div>

                {users.length === 0 ? (
                  <div className="space-y-2 rounded-xl border border-dashed p-8 text-center">
                    <p className="text-muted-foreground text-sm">No team members configured yet.</p>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddUser}>
                      Add First Member
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {users.map((user, idx) => (
                      <div key={user.id || idx} className="space-y-3 rounded-xl border bg-card p-4 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                            Member #{idx + 1}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveUser(user.id)}
                            aria-label={`Remove member ${user.name || idx + 1}`}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Full Name</Label>
                            <Input
                              value={user.name}
                              onChange={(e) => handleUpdateUser(user.id, "name", e.target.value)}
                              placeholder="e.g. Jane Doe"
                              className="h-8 text-xs"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Email Address</Label>
                            <Input
                              type="email"
                              value={user.email}
                              onChange={(e) => handleUpdateUser(user.id, "email", e.target.value)}
                              placeholder="e.g. user@test.org"
                              className="h-8 text-xs"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 items-center gap-3 pt-1 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Role Profile</Label>
                            <Select
                              value={user.profile || "employee"}
                              onValueChange={(val) => handleUpdateUser(user.id, "profile", val)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="employee">Employee</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="finance">Finance</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="mt-4 flex items-center justify-between rounded-md border bg-muted/10 px-3 py-1.5 sm:mt-0">
                            <span className="font-medium text-xs">Password Set</span>
                            <Switch
                              size="sm"
                              checked={Boolean(user.passwordIsSet)}
                              onCheckedChange={(val) => handleUpdateUser(user.id, "passwordIsSet", val)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </div>

            <DialogFooter className="flex flex-row items-center justify-between gap-2 border-t bg-muted/20 p-4 sm:justify-end sm:p-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="gap-2">
                {isSaving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <span>Save Onboarding Data</span>
                )}
              </Button>
            </DialogFooter>
          </Tabs>
        </form>
      </DialogContent>
    </Dialog>
  );
}
