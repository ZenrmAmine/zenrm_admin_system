"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ZenrmOption = { id: string; name: string };
type CampaignOperation = "createCampaign" | "createProgram" | "createCenter" | "linkPrograms";

async function requestZenrm(operation: CampaignOperation, payload: Record<string, unknown>) {
  const response = await fetch("/api/zenrm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ operation, payload }),
  });

  const text = await response.text();
  let parsed: unknown = {};

  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text };
    }
  }

  if (!response.ok) {
    const message =
      typeof parsed === "object" && parsed && "error" in parsed ? String((parsed as { error?: string }).error) : text || "Request failed.";

    throw new Error(message);
  }

  return parsed;
}

async function requestZenrmList(operation: "listPrograms" | "listCenters"): Promise<ZenrmOption[]> {
  const response = await fetch(`/api/zenrm?operation=${operation}`);
  const payload = (await response.json()) as unknown;

  if (!response.ok) {
    throw new Error(
      typeof payload === "object" && payload && "error" in payload ? String(payload.error) : "Unable to load options.",
    );
  }

  const records = Array.isArray(payload)
    ? payload
    : typeof payload === "object" && payload
      ? Object.values(payload).flatMap((value) => (Array.isArray(value) ? value : []))
      : [];

  return records.flatMap((record) => {
    if (typeof record !== "object" || !record || !("id" in record)) return [];
    const item = record as { id?: unknown; name?: unknown; title?: unknown };
    return typeof item.id === "string"
      ? [{ id: item.id, name: String(item.name ?? item.title ?? item.id) }]
      : [];
  });
}

function getCreatedCampaignId(payload: unknown): string | null {
  if (typeof payload !== "object" || !payload) return null;
  const record = payload as { id?: unknown; campaign_id?: unknown; data?: unknown };
  if (typeof record.id === "string") return record.id;
  if (typeof record.campaign_id === "string") return record.campaign_id;
  return getCreatedCampaignId(record.data);
}

export function CampaignManager() {
  const [campaignForm, setCampaignForm] = useState({
    name: "Amine Test",
    status: "active",
    center_id: "",
    program_ids: [] as string[],
    owner_user_id: "36480f95-d500-4d12-a54f-3cf2567a5557",
    last_synced_from_crm_at: "",
  });
  const [programForm, setProgramForm] = useState({
    name: "Annual Giving",
    crm_id: "crm_12345",
    requires_specific_amount: "false",
    amount: "100.00",
  });
  const [centerForm, setCenterForm] = useState({
    name: "Center Name",
    phone: "+1888888888",
    address: "Tunisia",
  });
  const [linkForm, setLinkForm] = useState({
    campaignId: "242a7ec4-e08f-41f0-b858-398a342b2ad8",
    programIds: "84c8fcf2-8906-4fac-b13e-f93da6f1e932,8d886092-f070-4e7c-b6a7-475e8d26cfc5",
  });

  const [campaignStatus, setCampaignStatus] = useState<{ isLoading: boolean; message: string; result: string }>({
    isLoading: false,
    message: "",
    result: "",
  });
  const [programStatus, setProgramStatus] = useState<{ isLoading: boolean; message: string; result: string }>({
    isLoading: false,
    message: "",
    result: "",
  });
  const [centerStatus, setCenterStatus] = useState<{ isLoading: boolean; message: string; result: string }>({
    isLoading: false,
    message: "",
    result: "",
  });
  const [linkStatus, setLinkStatus] = useState<{ isLoading: boolean; message: string; result: string }>({
    isLoading: false,
    message: "",
    result: "",
  });
  const [availablePrograms, setAvailablePrograms] = useState<ZenrmOption[]>([]);
  const [availableCenters, setAvailableCenters] = useState<ZenrmOption[]>([]);
  const [optionsStatus, setOptionsStatus] = useState("Loading programs and centers...");

  useEffect(() => {
    let isCurrent = true;

    Promise.all([requestZenrmList("listPrograms"), requestZenrmList("listCenters")])
      .then(([programs, centers]) => {
        if (!isCurrent) return;
        setAvailablePrograms(programs);
        setAvailableCenters(centers);
        setOptionsStatus("");
      })
      .catch((error) => {
        if (isCurrent) setOptionsStatus(error instanceof Error ? error.message : "Unable to load programs and centers.");
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const handleCampaignSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!campaignForm.center_id || campaignForm.program_ids.length === 0) {
      setCampaignStatus({ isLoading: false, message: "Choose one center and at least one program.", result: "" });
      return;
    }

    setCampaignStatus({ isLoading: true, message: "Creating campaign...", result: "" });

    try {
      const payload = {
        name: campaignForm.name,
        status: campaignForm.status,
        last_synced_from_crm_at: campaignForm.last_synced_from_crm_at || null,
        center_id: campaignForm.center_id,
        program_id: campaignForm.program_ids[0],
        owner_user_id: campaignForm.owner_user_id,
      };

      const result = await requestZenrm("createCampaign", payload);
      const campaignId = getCreatedCampaignId(result);

      if (campaignId && campaignForm.program_ids.length > 1) {
        await requestZenrm("linkPrograms", {
          campaignId,
          programIds: campaignForm.program_ids.slice(1),
        });
      }

      setCampaignStatus({
        isLoading: false,
        message: "Campaign created successfully.",
        result: JSON.stringify(result, null, 2),
      });
    } catch (error) {
      setCampaignStatus({
        isLoading: false,
        message: error instanceof Error ? error.message : "Unable to create campaign.",
        result: "",
      });
    }
  };

  const handleProgramSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setProgramStatus({ isLoading: true, message: "Creating program...", result: "" });

    try {
      const payload = {
        name: programForm.name,
        crm_id: programForm.crm_id,
        requires_specific_amount: programForm.requires_specific_amount === "true",
        amount: Number(programForm.amount),
      };

      const result = await requestZenrm("createProgram", payload);

      setProgramStatus({
        isLoading: false,
        message: "Program created successfully.",
        result: JSON.stringify(result, null, 2),
      });
    } catch (error) {
      setProgramStatus({
        isLoading: false,
        message: error instanceof Error ? error.message : "Unable to create program.",
        result: "",
      });
    }
  };

  const handleCenterSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setCenterStatus({ isLoading: true, message: "Creating center...", result: "" });

    try {
      const payload = {
        name: centerForm.name,
        phone: centerForm.phone,
        address: centerForm.address,
      };

      const result = await requestZenrm("createCenter", payload);

      setCenterStatus({
        isLoading: false,
        message: "Center created successfully.",
        result: JSON.stringify(result, null, 2),
      });
    } catch (error) {
      setCenterStatus({
        isLoading: false,
        message: error instanceof Error ? error.message : "Unable to create center.",
        result: "",
      });
    }
  };

  const handleLinkSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLinkStatus({ isLoading: true, message: "Linking program(s) to campaign...", result: "" });

    try {
      const payload = {
        campaignId: linkForm.campaignId,
        programIds: linkForm.programIds
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      };

      const result = await requestZenrm("linkPrograms", payload);

      setLinkStatus({
        isLoading: false,
        message: "Campaign and programs linked successfully.",
        result: JSON.stringify(result, null, 2),
      });
    } catch (error) {
      setLinkStatus({
        isLoading: false,
        message: error instanceof Error ? error.message : "Unable to link programs.",
        result: "",
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-3xl tracking-tight">Campaigns & Programs</h1>
        <p className="text-sm text-muted-foreground">
          Create campaigns, programs, and centers, then link programs to a campaign.
        </p>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
            Authenticated with the backend session token. No manual bearer token is required here.
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="campaigns" className="flex flex-col gap-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="centers">Centers</TabsTrigger>
          <TabsTrigger value="links">Link programs</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle>Create campaign</CardTitle>
              <CardDescription>Use the campaign API payload to create a campaign.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCampaignSubmit}>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Name</label>
                  <Input
                    value={campaignForm.name}
                    onChange={(event) => setCampaignForm((current) => ({ ...current, name: event.target.value }))}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Status</label>
                  <Input
                    value={campaignForm.status}
                    onChange={(event) => setCampaignForm((current) => ({ ...current, status: event.target.value }))}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Last synced from CRM</label>
                  <Input
                    value={campaignForm.last_synced_from_crm_at}
                    onChange={(event) =>
                      setCampaignForm((current) => ({ ...current, last_synced_from_crm_at: event.target.value }))
                    }
                    placeholder="null or ISO date"
                  />
                </div>

                <div>
                  <label htmlFor="campaign-center" className="mb-1 block text-sm font-medium">
                    Center
                  </label>
                  <NativeSelect
                    id="campaign-center"
                    value={campaignForm.center_id}
                    onChange={(event) => setCampaignForm((current) => ({ ...current, center_id: event.target.value }))}
                    required
                    disabled={availableCenters.length === 0}
                  >
                    <NativeSelectOption value="">Choose one center</NativeSelectOption>
                    {availableCenters.map((center) => (
                      <NativeSelectOption key={center.id} value={center.id}>
                        {center.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>

                <div>
                  <label htmlFor="campaign-programs" className="mb-1 block text-sm font-medium">
                    Programs
                  </label>
                  <NativeSelect
                    id="campaign-programs"
                    multiple
                    value={campaignForm.program_ids}
                    onChange={(event) =>
                      setCampaignForm((current) => ({
                        ...current,
                        program_ids: Array.from(event.target.selectedOptions, (option) => option.value),
                      }))
                    }
                    required
                    disabled={availablePrograms.length === 0}
                    className="h-32"
                  >
                    {availablePrograms.map((program) => (
                      <NativeSelectOption key={program.id} value={program.id}>
                        {program.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>

                {optionsStatus ? <div className="md:col-span-2 text-sm text-muted-foreground">{optionsStatus}</div> : null}

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Owner user ID</label>
                  <Input
                    value={campaignForm.owner_user_id}
                    onChange={(event) => setCampaignForm((current) => ({ ...current, owner_user_id: event.target.value }))}
                  />
                </div>

                <div className="md:col-span-2 flex items-center gap-3 pt-2">
                  <Button type="submit" disabled={campaignStatus.isLoading}>
                    {campaignStatus.isLoading ? "Creating..." : "Create campaign"}
                  </Button>
                </div>
              </form>

              {campaignStatus.message ? (
                <div className="mt-4 rounded-lg border bg-muted/40 p-3 text-sm">
                  <div className="font-medium">{campaignStatus.message}</div>
                  {campaignStatus.result ? <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs">{campaignStatus.result}</pre> : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="programs">
          <Card>
            <CardHeader>
              <CardTitle>Create program</CardTitle>
              <CardDescription>Add a fundraising program with optional amount rules.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 md:grid-cols-2" onSubmit={handleProgramSubmit}>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Program name</label>
                  <Input
                    value={programForm.name}
                    onChange={(event) => setProgramForm((current) => ({ ...current, name: event.target.value }))}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">CRM ID</label>
                  <Input
                    value={programForm.crm_id}
                    onChange={(event) => setProgramForm((current) => ({ ...current, crm_id: event.target.value }))}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Requires specific amount</label>
                  <select
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    value={programForm.requires_specific_amount}
                    onChange={(event) =>
                      setProgramForm((current) => ({ ...current, requires_specific_amount: event.target.value }))
                    }
                  >
                    <option value="false">false</option>
                    <option value="true">true</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Amount</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={programForm.amount}
                    onChange={(event) => setProgramForm((current) => ({ ...current, amount: event.target.value }))}
                  />
                </div>

                <div className="md:col-span-2 flex items-center gap-3 pt-2">
                  <Button type="submit" disabled={programStatus.isLoading}>
                    {programStatus.isLoading ? "Creating..." : "Create program"}
                  </Button>
                </div>
              </form>

              {programStatus.message ? (
                <div className="mt-4 rounded-lg border bg-muted/40 p-3 text-sm">
                  <div className="font-medium">{programStatus.message}</div>
                  {programStatus.result ? <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs">{programStatus.result}</pre> : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="centers">
          <Card>
            <CardHeader>
              <CardTitle>Create center</CardTitle>
              <CardDescription>Create a center with the contact and address details.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCenterSubmit}>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Center name</label>
                  <Input
                    value={centerForm.name}
                    onChange={(event) => setCenterForm((current) => ({ ...current, name: event.target.value }))}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Phone</label>
                  <Input
                    value={centerForm.phone}
                    onChange={(event) => setCenterForm((current) => ({ ...current, phone: event.target.value }))}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Address</label>
                  <Input
                    value={centerForm.address}
                    onChange={(event) => setCenterForm((current) => ({ ...current, address: event.target.value }))}
                  />
                </div>

                <div className="md:col-span-2 flex items-center gap-3 pt-2">
                  <Button type="submit" disabled={centerStatus.isLoading}>
                    {centerStatus.isLoading ? "Creating..." : "Create center"}
                  </Button>
                </div>
              </form>

              {centerStatus.message ? (
                <div className="mt-4 rounded-lg border bg-muted/40 p-3 text-sm">
                  <div className="font-medium">{centerStatus.message}</div>
                  {centerStatus.result ? <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs">{centerStatus.result}</pre> : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="links">
          <Card>
            <CardHeader>
              <CardTitle>Link program(s) to campaign</CardTitle>
              <CardDescription>Associate one or many programs to a campaign.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 md:grid-cols-2" onSubmit={handleLinkSubmit}>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Campaign ID</label>
                  <Input
                    value={linkForm.campaignId}
                    onChange={(event) => setLinkForm((current) => ({ ...current, campaignId: event.target.value }))}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Program IDs</label>
                  <Input
                    value={linkForm.programIds}
                    onChange={(event) => setLinkForm((current) => ({ ...current, programIds: event.target.value }))}
                    placeholder="comma-separated UUIDs"
                  />
                </div>

                <div className="md:col-span-2 flex items-center gap-3 pt-2">
                  <Button type="submit" disabled={linkStatus.isLoading}>
                    {linkStatus.isLoading ? "Linking..." : "Link programs"}
                  </Button>
                </div>
              </form>

              {linkStatus.message ? (
                <div className="mt-4 rounded-lg border bg-muted/40 p-3 text-sm">
                  <div className="font-medium">{linkStatus.message}</div>
                  {linkStatus.result ? <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs">{linkStatus.result}</pre> : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
