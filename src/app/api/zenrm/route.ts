import { NextResponse } from "next/server";

import { isAxiosError } from "axios";

import { apiClient, extractErrorMessage } from "@/lib/api-client";
import { clearZenrmSessionToken, getZenrmSessionToken } from "@/lib/auth/session";

const BACKEND_URLS = {
  listPrograms: "/program/zenrm/programs",
  listCenters: "/center/zenrm/",
  createCampaign: "/campaign/zenrm/entries/",
  createProgram: "/program/zenrm/programs",
  createCenter: "/center/zenrm/create",
  linkPrograms: "/campaign/zenrm/linkprogramtocampaign",
  getDonation: "/donation/zenrm/findAll",
  getDonationAnalytics: "/donation/zenrm/analytics",
  getClient: "/client",
} as const;

const READ_OPERATIONS = new Set<keyof typeof BACKEND_URLS>([
  "listPrograms",
  "listCenters",
  "getDonation",
  "getDonationAnalytics",
  "getClient",
]);

async function getBearerToken(): Promise<string | null> {
  const token = (await getZenrmSessionToken())?.trim();
  console.log("Retrieved ZenRM session token:", token);
  if (!token) return null;

  return token.replace(/^Bearer\s+/i, "");
}

async function forwardRequest(request: Request, method: "GET" | "POST") {
  const token = await getBearerToken();

  if (!token) {
    return NextResponse.json({ error: "No active session found. Please log in again." }, { status: 401 });
  }

  const body =
    method === "POST"
      ? ((await request.json()) as {
          operation?: keyof typeof BACKEND_URLS;
          payload?: Record<string, unknown>;
        })
      : null;

  const urlObj = new URL(request.url);
  const operation = method === "GET" ? urlObj.searchParams.get("operation") : body?.operation;
  const payload = body?.payload ?? {};
  const clientId =
    urlObj.searchParams.get("clientId") ?? (typeof payload.clientId === "string" ? payload.clientId : null);

  let url: string | null =
    operation && operation in BACKEND_URLS ? BACKEND_URLS[operation as keyof typeof BACKEND_URLS] : null;

  if (operation === "getClient" && clientId) {
    url = `${BACKEND_URLS.getClient}/${clientId}`;
  }

  if (!url || (method === "GET" && !READ_OPERATIONS.has(operation as keyof typeof BACKEND_URLS))) {
    return NextResponse.json({ error: "Unsupported ZenRM operation." }, { status: 400 });
  }

  try {
    const response = await apiClient.request({
      url,
      method,
      headers: { Authorization: `Bearer ${token}` },
      ...(method === "POST" ? { data: payload } : {}),
    });

    return NextResponse.json(response.data, { status: response.status });
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return NextResponse.json(
        {
          error: extractErrorMessage(error.response.data, "The ZenRM request failed.", ["detail", "message", "error"]),
          details: error.response.data,
        },
        { status: error.response.status || 500 },
      );
    }

    return NextResponse.json(
      {
        error: `Unable to reach ZenRM for ${operation}.`,
        details: error instanceof Error ? error.message : String(error),
        upstreamUrl: url,
      },
      { status: 502 },
    );
  }
}

export async function GET(request: Request) {
  return forwardRequest(request, "GET");
}

export async function POST(request: Request) {
  return forwardRequest(request, "POST");
}

export async function DELETE(_request: Request) {
  await clearZenrmSessionToken();
  return NextResponse.json({ message: "Logged out successfully" }, { status: 200 });
}
