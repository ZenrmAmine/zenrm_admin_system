"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CheckSquare, Plus, RefreshCw, Search, Square, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
      typeof parsed === "object" && parsed && "error" in parsed
        ? String((parsed as { error?: string }).error)
        : text || "Request failed.";

    throw new Error(message);
  }

  return parsed;
}

function extractRecords(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (typeof payload !== "object" || payload === null) return [];

  const record = payload as Record<string, unknown>;

  // Check common container keys
  for (const key of ["data", "programs", "centers", "results", "items", "records", "rows", "entries"]) {
    const val = record[key];
    if (Array.isArray(val)) return val;
    if (typeof val === "object" && val !== null) {
      for (const subKey of ["data", "programs", "centers", "results", "items", "records", "rows", "entries"]) {
        const subVal = (val as Record<string, unknown>)[subKey];
        if (Array.isArray(subVal)) return subVal;
      }
    }
  }

  // Fallback: search values for an array
  for (const val of Object.values(record)) {
    if (Array.isArray(val)) return val;
  }

  return [];
}

function extractZenrmOption(record: unknown): ZenrmOption | null {
  if (typeof record !== "object" || record === null) return null;

  const item = record as Record<string, unknown>;

  const idCandidates = [
    item.id,
    item.program_id,
    item.center_id,
    item.campaign_id,
    item.programId,
    item.centerId,
    item._id,
    item.uuid,
    item.code,
  ];
  const foundId = idCandidates.find((c) => (typeof c === "string" && c.trim().length > 0) || typeof c === "number");
  if (foundId == null) return null;

  const id = String(foundId).trim();

  const nameCandidates = [
    item.name,
    item.program_name,
    item.center_name,
    item.campaign_name,
    item.title,
    item.programName,
    item.centerName,
    item.label,
    item.description,
  ];
  const foundName = nameCandidates.find((c) => typeof c === "string" && c.trim().length > 0);
  const name = foundName ? String(foundName).trim() : id;

  return { id, name };
}

async function requestZenrmList(operation: "listPrograms" | "listCenters"): Promise<ZenrmOption[]> {
  const response = await fetch(`/api/zenrm?operation=${operation}`);
  const payload = (await response.json()) as unknown;

  console.log(`[ZenRM API] ${operation} (status ${response.status}):`, payload);

  if (!response.ok) {
    const errorMsg =
      typeof payload === "object" && payload && "error" in payload
        ? String((payload as { error?: string }).error)
        : `Unable to load ${operation} (HTTP ${response.status}).`;
    console.error(`[ZenRM API] ${operation} error:`, errorMsg, payload);
    throw new Error(errorMsg);
  }

  const rawRecords = extractRecords(payload);
  const options = rawRecords.map(extractZenrmOption).filter((opt): opt is ZenrmOption => opt !== null);

  console.log(`[ZenRM API] ${operation} parsed options (${options.length}):`, options);
  return options;
}

export function CampaignManager() {
  const [campaignForm, setCampaignForm] = useState({
    name: "Amine Test with new changes",
    status: "active",
    center_id: "",
    program_ids: [] as string[],
    spNationality: "Tunisian",
    SpIsDefault: true,
    startDate: "",
    endDate: "",
    last_synced_from_crm_at: "",
  });
  const [programSearch, setProgramSearch] = useState("");
  const [manualProgramInput, setManualProgramInput] = useState("");
  const [manualCenterEntry, setManualCenterEntry] = useState(false);

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
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [programsStatusMsg, setProgramsStatusMsg] = useState("");
  const [centersStatusMsg, setCentersStatusMsg] = useState("");

  const loadOptions = useCallback(async () => {
    setIsLoadingOptions(true);
    setProgramsStatusMsg("Fetching programs from database...");
    setCentersStatusMsg("Fetching centers from database...");

    const [programsResult, centersResult] = await Promise.allSettled([
      requestZenrmList("listPrograms"),
      requestZenrmList("listCenters"),
    ]);

    if (programsResult.status === "fulfilled") {
      setAvailablePrograms(programsResult.value);
      if (programsResult.value.length === 0) {
        setProgramsStatusMsg("0 programs returned from database.");
      } else {
        setProgramsStatusMsg("");
      }
    } else {
      const err = programsResult.reason instanceof Error ? programsResult.reason.message : "Failed to load programs.";
      setProgramsStatusMsg(err);
      toast.error(`Programs: ${err}`);
    }

    if (centersResult.status === "fulfilled") {
      setAvailableCenters(centersResult.value);
      if (centersResult.value.length === 0) {
        setCentersStatusMsg("0 centers returned from database.");
        setManualCenterEntry(true);
      } else {
        setCentersStatusMsg("");
        setCampaignForm((current) => {
          if (current.center_id) return current;
          const preferred =
            centersResult.value.find((c) => c.id === "af1b9803-84c7-47af-81a1-c6905c20d6c5") ?? centersResult.value[0];
          return { ...current, center_id: preferred ? preferred.id : "" };
        });
      }
    } else {
      const err = centersResult.reason instanceof Error ? centersResult.reason.message : "Failed to load centers.";
      setCentersStatusMsg(err);
      setManualCenterEntry(true);
      toast.error(`Centers: ${err}`);
    }

    setIsLoadingOptions(false);
  }, []);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const filteredPrograms = useMemo(() => {
    if (!programSearch.trim()) return availablePrograms;
    const searchLower = programSearch.toLowerCase();
    return availablePrograms.filter(
      (program) => program.name.toLowerCase().includes(searchLower) || program.id.toLowerCase().includes(searchLower),
    );
  }, [availablePrograms, programSearch]);

  const toggleProgram = (id: string) => {
    setCampaignForm((current) => {
      const exists = current.program_ids.includes(id);
      return {
        ...current,
        program_ids: exists ? current.program_ids.filter((pId) => pId !== id) : [...current.program_ids, id],
      };
    });
  };

  const selectAllFilteredPrograms = () => {
    const filteredIds = filteredPrograms.map((p) => p.id);
    setCampaignForm((current) => ({
      ...current,
      program_ids: Array.from(new Set([...current.program_ids, ...filteredIds])),
    }));
  };

  const clearSelectedPrograms = () => {
    setCampaignForm((current) => ({
      ...current,
      program_ids: [],
    }));
  };

  const addManualProgram = () => {
    const trimmed = manualProgramInput.trim();
    if (!trimmed) return;
    const ids = trimmed
      .split(/[,\s]+/)
      .map((id) => id.trim())
      .filter(Boolean);

    setCampaignForm((current) => ({
      ...current,
      program_ids: Array.from(new Set([...current.program_ids, ...ids])),
    }));
    setManualProgramInput("");
    toast.success(`Added ${ids.length} program ID(s).`);
  };

  const fillSampleCurlData = () => {
    setCampaignForm((current) => ({
      ...current,
      name: "Amine Test with new changes",
      status: "active",
      center_id: "af1b9803-84c7-47af-81a1-c6905c20d6c5",
      program_ids: ["20814529-ddff-4c37-a286-558265bfa6e9", "e3a8cc2d-ca5c-423c-8377-c437c162009d"],
      spNationality: "Tunisian",
      SpIsDefault: true,
      startDate: "",
      endDate: "",
      last_synced_from_crm_at: "",
    }));
    setManualCenterEntry(true);
    toast.info("Prefilled with curl sample IDs.");
  };

  const handleCampaignSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!campaignForm.name.trim()) {
      toast.error("Please provide a campaign name.");
      setCampaignStatus({ isLoading: false, message: "Campaign name is required.", result: "" });
      return;
    }

    if (!campaignForm.center_id) {
      toast.error("Please choose a center.");
      setCampaignStatus({ isLoading: false, message: "Choose one center.", result: "" });
      return;
    }

    if (campaignForm.program_ids.length === 0) {
      toast.error("Please choose at least one program.");
      setCampaignStatus({ isLoading: false, message: "Choose at least one program.", result: "" });
      return;
    }

    setCampaignStatus({ isLoading: true, message: "Creating campaign...", result: "" });

    try {
      const payload = {
        name: campaignForm.name.trim(),
        status: campaignForm.status,
        last_synced_from_crm_at: campaignForm.last_synced_from_crm_at
          ? new Date(campaignForm.last_synced_from_crm_at).toISOString()
          : null,
        center_id: campaignForm.center_id,
        program_id: campaignForm.program_ids,
        spNationality: campaignForm.spNationality.trim() || "Tunisian",
        SpIsDefault: Boolean(campaignForm.SpIsDefault),
        startDate: campaignForm.startDate ? new Date(campaignForm.startDate).toISOString() : null,
        endDate: campaignForm.endDate ? new Date(campaignForm.endDate).toISOString() : null,
      };

      const result = await requestZenrm("createCampaign", payload);

      toast.success("Campaign created successfully!");
      setCampaignStatus({
        isLoading: false,
        message: "Campaign created successfully.",
        result: JSON.stringify(result, null, 2),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create campaign.";
      toast.error(message);
      setCampaignStatus({
        isLoading: false,
        message,
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

  let centerPlaceholder = "Choose one center";
  if (isLoadingOptions) {
    centerPlaceholder = "Loading centers...";
  } else if (availableCenters.length === 0) {
    centerPlaceholder = "No centers found (enter manually)";
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-3xl tracking-tight">Campaigns & Programs</h1>
        <p className="text-muted-foreground text-sm">
          Create campaigns, programs, and centers, then link programs to a campaign.
        </p>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-muted-foreground text-sm">
            Authenticated with the backend session token. No manual bearer token is required here.
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="campaigns" className="flex flex-col gap-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="centers">Centers</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Create campaign</CardTitle>
                  <CardDescription>
                    Configure campaign details, select the center, and assign one or more programs.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" size="xs" variant="outline" onClick={loadOptions} disabled={isLoadingOptions}>
                    <RefreshCw className={`size-3.5 ${isLoadingOptions ? "animate-spin" : ""}`} />
                    {isLoadingOptions ? "Fetching DB..." : "Reload from DB"}
                  </Button>
                  <Button type="button" size="xs" variant="secondary" onClick={fillSampleCurlData}>
                    Fill sample IDs
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form className="grid gap-6 md:grid-cols-2" onSubmit={handleCampaignSubmit}>
                <div className="md:col-span-2">
                  <Label htmlFor="campaign-name" className="mb-1.5 block font-medium text-sm">
                    Campaign Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="campaign-name"
                    value={campaignForm.name}
                    onChange={(event) => setCampaignForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="e.g. Amine Test with new changes"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="campaign-status" className="mb-1.5 block font-medium text-sm">
                    Status
                  </Label>
                  <Select
                    value={campaignForm.status}
                    onValueChange={(value) => setCampaignForm((current) => ({ ...current, status: value }))}
                  >
                    <SelectTrigger id="campaign-status" className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <Label htmlFor="campaign-center" className="font-medium text-sm">
                      Center <span className="text-destructive">*</span>
                    </Label>
                    <button
                      type="button"
                      onClick={() => setManualCenterEntry((current) => !current)}
                      className="text-primary text-xs hover:underline"
                    >
                      {manualCenterEntry ? "Select from list" : "Enter ID manually"}
                    </button>
                  </div>

                  {manualCenterEntry ? (
                    <Input
                      id="campaign-center"
                      value={campaignForm.center_id}
                      onChange={(event) =>
                        setCampaignForm((current) => ({ ...current, center_id: event.target.value }))
                      }
                      placeholder="e.g. af1b9803-84c7-47af-81a1-c6905c20d6c5"
                      required
                    />
                  ) : (
                    <Select
                      value={campaignForm.center_id}
                      onValueChange={(value) => setCampaignForm((current) => ({ ...current, center_id: value }))}
                      disabled={availableCenters.length === 0}
                    >
                      <SelectTrigger id="campaign-center" className="w-full">
                        <SelectValue placeholder={centerPlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {availableCenters.map((center) => (
                            <SelectItem key={center.id} value={center.id}>
                              {center.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}

                  {centersStatusMsg ? <p className="mt-1 text-muted-foreground text-xs">{centersStatusMsg}</p> : null}
                </div>

                {/* Multi-program selection component */}
                <div className="flex flex-col gap-2 md:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="block font-medium text-sm">
                      Select Programs <span className="text-destructive">*</span>
                      <span className="ml-2 font-normal text-muted-foreground text-xs">
                        ({campaignForm.program_ids.length} selected)
                      </span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        onClick={selectAllFilteredPrograms}
                        disabled={filteredPrograms.length === 0}
                      >
                        <CheckSquare className="size-3.5" />
                        Select all
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        onClick={clearSelectedPrograms}
                        disabled={campaignForm.program_ids.length === 0}
                      >
                        <Square className="size-3.5" />
                        Clear
                      </Button>
                    </div>
                  </div>

                  {/* Selected program badges */}
                  {campaignForm.program_ids.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 rounded-lg border bg-muted/20 p-2">
                      {campaignForm.program_ids.map((id) => {
                        const prog = availablePrograms.find((p) => p.id === id);
                        return (
                          <Badge key={id} variant="secondary" className="flex items-center gap-1.5 py-1 pr-1.5 pl-2.5">
                            <span className="max-w-[220px] truncate">{prog?.name ?? id}</span>
                            <button
                              type="button"
                              onClick={() => toggleProgram(id)}
                              className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              aria-label={`Remove ${prog?.name ?? id}`}
                            >
                              <X className="size-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}

                  {/* Program search and scrollable checkbox list */}
                  <div className="rounded-lg border bg-card p-3 shadow-xs">
                    <div className="relative mb-2">
                      <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
                      <Input
                        value={programSearch}
                        onChange={(e) => setProgramSearch(e.target.value)}
                        placeholder="Search available programs by name or ID..."
                        className="pl-8"
                      />
                    </div>

                    <div className="max-h-52 divide-y overflow-y-auto rounded-md border">
                      {filteredPrograms.length > 0 ? (
                        filteredPrograms.map((program) => {
                          const isSelected = campaignForm.program_ids.includes(program.id);
                          return (
                            <label
                              key={program.id}
                              htmlFor={`program-${program.id}`}
                              className={`flex cursor-pointer items-center justify-between p-2.5 text-sm transition-colors hover:bg-muted/50 ${
                                isSelected ? "bg-accent/40 font-medium" : ""
                              }`}
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <Checkbox
                                  id={`program-${program.id}`}
                                  checked={isSelected}
                                  onCheckedChange={() => toggleProgram(program.id)}
                                  aria-label={program.name}
                                />
                                <span className="truncate">{program.name}</span>
                              </div>
                              <span className="font-mono text-muted-foreground text-xs">
                                {program.id.slice(0, 8)}...
                              </span>
                            </label>
                          );
                        })
                      ) : (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                          {isLoadingOptions
                            ? "Loading programs from database..."
                            : programsStatusMsg || "No programs found matching search."}
                        </div>
                      )}
                    </div>

                    {/* Manual Program ID input fallback */}
                    <div className="mt-3 flex items-center gap-2 border-t pt-2.5">
                      <Input
                        value={manualProgramInput}
                        onChange={(e) => setManualProgramInput(e.target.value)}
                        placeholder="Or paste Program UUID manually (e.g. 20814529-ddff-...)"
                        className="h-8 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addManualProgram();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={addManualProgram}
                        disabled={!manualProgramInput.trim()}
                      >
                        <Plus className="size-3.5" />
                        Add ID
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="sp-nationality" className="mb-1.5 block font-medium text-sm">
                    Nationality (spNationality)
                  </Label>
                  <Input
                    id="sp-nationality"
                    value={campaignForm.spNationality}
                    onChange={(event) =>
                      setCampaignForm((current) => ({ ...current, spNationality: event.target.value }))
                    }
                    placeholder="e.g. Tunisian"
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="sp-is-default" className="font-medium text-sm">
                      Default Campaign (SpIsDefault)
                    </Label>
                    <p className="text-muted-foreground text-xs">Set as the default campaign for this center</p>
                  </div>
                  <Switch
                    id="sp-is-default"
                    checked={campaignForm.SpIsDefault}
                    onCheckedChange={(checked) => setCampaignForm((current) => ({ ...current, SpIsDefault: checked }))}
                  />
                </div>

                <div>
                  <Label htmlFor="campaign-start-date" className="mb-1.5 block font-medium text-sm">
                    Start Date
                  </Label>
                  <Input
                    id="campaign-start-date"
                    type="date"
                    value={campaignForm.startDate}
                    onChange={(event) => setCampaignForm((current) => ({ ...current, startDate: event.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="campaign-end-date" className="mb-1.5 block font-medium text-sm">
                    End Date
                  </Label>
                  <Input
                    id="campaign-end-date"
                    type="date"
                    value={campaignForm.endDate}
                    onChange={(event) => setCampaignForm((current) => ({ ...current, endDate: event.target.value }))}
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="campaign-synced-at" className="mb-1.5 block font-medium text-sm">
                    Last Synced from CRM (optional)
                  </Label>
                  <Input
                    id="campaign-synced-at"
                    type="datetime-local"
                    value={campaignForm.last_synced_from_crm_at}
                    onChange={(event) =>
                      setCampaignForm((current) => ({ ...current, last_synced_from_crm_at: event.target.value }))
                    }
                    placeholder="Leave empty for null"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2 md:col-span-2">
                  <Button type="submit" disabled={campaignStatus.isLoading}>
                    {campaignStatus.isLoading ? "Creating campaign..." : "Create campaign"}
                  </Button>
                </div>
              </form>

              {campaignStatus.message ? (
                <div className="mt-4 rounded-lg border bg-muted/40 p-3 text-sm">
                  <div className="font-medium">{campaignStatus.message}</div>
                  {campaignStatus.result ? (
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs">{campaignStatus.result}</pre>
                  ) : null}
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
                  <Label htmlFor="program-create-name" className="mb-1 block font-medium text-sm">
                    Program name
                  </Label>
                  <Input
                    id="program-create-name"
                    value={programForm.name}
                    onChange={(event) => setProgramForm((current) => ({ ...current, name: event.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="program-create-crm-id" className="mb-1 block font-medium text-sm">
                    CRM ID
                  </Label>
                  <Input
                    id="program-create-crm-id"
                    value={programForm.crm_id}
                    onChange={(event) => setProgramForm((current) => ({ ...current, crm_id: event.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="program-create-requires-amount" className="mb-1 block font-medium text-sm">
                    Requires specific amount
                  </Label>
                  <select
                    id="program-create-requires-amount"
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
                  <Label htmlFor="program-create-amount" className="mb-1 block font-medium text-sm">
                    Amount
                  </Label>
                  <Input
                    id="program-create-amount"
                    type="number"
                    step="0.01"
                    value={programForm.amount}
                    onChange={(event) => setProgramForm((current) => ({ ...current, amount: event.target.value }))}
                  />
                </div>

                <div className="flex items-center gap-3 pt-2 md:col-span-2">
                  <Button type="submit" disabled={programStatus.isLoading}>
                    {programStatus.isLoading ? "Creating..." : "Create program"}
                  </Button>
                </div>
              </form>

              {programStatus.message ? (
                <div className="mt-4 rounded-lg border bg-muted/40 p-3 text-sm">
                  <div className="font-medium">{programStatus.message}</div>
                  {programStatus.result ? (
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs">{programStatus.result}</pre>
                  ) : null}
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
                  <Label htmlFor="center-create-name" className="mb-1 block font-medium text-sm">
                    Center name
                  </Label>
                  <Input
                    id="center-create-name"
                    value={centerForm.name}
                    onChange={(event) => setCenterForm((current) => ({ ...current, name: event.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="center-create-phone" className="mb-1 block font-medium text-sm">
                    Phone
                  </Label>
                  <Input
                    id="center-create-phone"
                    value={centerForm.phone}
                    onChange={(event) => setCenterForm((current) => ({ ...current, phone: event.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="center-create-address" className="mb-1 block font-medium text-sm">
                    Address
                  </Label>
                  <Input
                    id="center-create-address"
                    value={centerForm.address}
                    onChange={(event) => setCenterForm((current) => ({ ...current, address: event.target.value }))}
                  />
                </div>

                <div className="flex items-center gap-3 pt-2 md:col-span-2">
                  <Button type="submit" disabled={centerStatus.isLoading}>
                    {centerStatus.isLoading ? "Creating..." : "Create center"}
                  </Button>
                </div>
              </form>

              {centerStatus.message ? (
                <div className="mt-4 rounded-lg border bg-muted/40 p-3 text-sm">
                  <div className="font-medium">{centerStatus.message}</div>
                  {centerStatus.result ? (
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs">{centerStatus.result}</pre>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
