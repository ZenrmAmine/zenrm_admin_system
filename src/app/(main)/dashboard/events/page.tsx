import "@/styles/flag-icons/flags.css";

import { getZenrmSessionToken } from "@/lib/auth/session";

import { CampaignManager, type ZenrmOption } from "./_components/campaign-manager";

const ZENRM_LIST_URLS = {
  programs: "https://test.zenrm.co/program/zenrm/programs",
  centers: "https://test.zenrm.co/center/zenrm/",
} as const;

function collectRecords(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload.flatMap(collectRecords);
  if (typeof payload !== "object" || !payload) return [];

  const record = payload as Record<string, unknown>;
  const identifier = [record.id, record._id, record.program_id, record.center_id, record.uuid].find(
    (value) => typeof value === "string" || typeof value === "number",
  );
  if (identifier !== undefined) return [record];

  return Object.values(record).flatMap(collectRecords);
}

async function getZenrmOptions(url: string, token: string): Promise<ZenrmOption[]> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token.replace(/^Bearer\s+/i, "")}` },
  });
  const text = await response.text();
  let payload: unknown = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }

  if (!response.ok) {
    const error = typeof payload === "object" && payload && "message" in payload ? payload.message : payload;
    throw new Error(`${response.status} ${String(error)}`);
  }

  return collectRecords(payload).flatMap((record) => {
    if (typeof record !== "object" || !record) return [];
    const item = record as {
      id?: unknown;
      _id?: unknown;
      program_id?: unknown;
      center_id?: unknown;
      uuid?: unknown;
      name?: unknown;
      title?: unknown;
      program_name?: unknown;
      center_name?: unknown;
    };
    const id = [item.id, item._id, item.program_id, item.center_id, item.uuid].find(
      (value) => typeof value === "string" || typeof value === "number",
    );
    if (id === undefined) return [];
    const name = item.name ?? item.title ?? item.program_name ?? item.center_name ?? id;
    return [{ id: String(id), name: String(name) }];
  });
}

export default async function Page() {
  const token = await getZenrmSessionToken();
  if (!token) {
    return <CampaignManager initialPrograms={[]} initialCenters={[]} optionsStatus="No active ZenRM session." />;
  }

  const results = await Promise.allSettled([
    getZenrmOptions(ZENRM_LIST_URLS.programs, token),
    getZenrmOptions(ZENRM_LIST_URLS.centers, token),
  ]);
  const availablePrograms = results[0].status === "fulfilled" ? results[0].value : [];
  const availableCenters = results[1].status === "fulfilled" ? results[1].value : [];
  const errors = results
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) => (result.reason instanceof Error ? result.reason.message : String(result.reason)));

  return (
    <CampaignManager
      initialPrograms={availablePrograms}
      initialCenters={availableCenters}
      optionsStatus={errors.length > 0 ? `Unable to load ZenRM options: ${errors.join("; ")}` : undefined}
    />
  );
}
