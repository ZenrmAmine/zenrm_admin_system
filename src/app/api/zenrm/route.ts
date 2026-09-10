import { NextResponse } from "next/server";

import { isAxiosError } from "axios";

import { apiClient, extractErrorMessage } from "@/lib/api-client";
import { clearZenrmSessionToken, getZenrmSessionToken, getZenrmSessionUser } from "@/lib/auth/session";

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
  updateOnboardingData: "/client/updateOnboardingData",
  listUsers: "/contact/zenrm/user",
  createUser: "/user/zenrm/create",
} as const;

const READ_OPERATIONS = new Set<keyof typeof BACKEND_URLS>([
  "listPrograms",
  "listCenters",
  "getDonation",
  "getDonationAnalytics",
  "getClient",
  "listUsers",
]);

async function getBearerToken(): Promise<string | null> {
  const token = (await getZenrmSessionToken())?.trim();
  console.log("Retrieved ZenRM session token:", token);
  if (!token) return null;

  return token.replace(/^Bearer\s+/i, "");
}

async function forwardRequest(request: Request, method: "GET" | "POST" | "PATCH") {
  const token = await getBearerToken();

  if (!token) {
    return NextResponse.json({ error: "No active session found. Please log in again." }, { status: 401 });
  }

  const body =
    method === "POST" || method === "PATCH"
      ? ((await request.json()) as {
          operation?: keyof typeof BACKEND_URLS;
          payload?: Record<string, unknown>;
        })
      : null;

  const urlObj = new URL(request.url);
  const operation = method === "GET" ? urlObj.searchParams.get("operation") : body?.operation;
  const payload = body?.payload ?? {};
  const queryClientId = urlObj.searchParams.get("clientId");
  const payloadClientId = typeof payload.clientId === "string" ? payload.clientId : null;
  const payloadClientIdSnake = typeof payload.client_id === "string" ? payload.client_id : null;
  const sessionUser = await getZenrmSessionUser();
  const clientId = queryClientId || payloadClientId || payloadClientIdSnake || sessionUser?.client_id || "CLT-QJM2RL";

  let url: string | null =
    operation && operation in BACKEND_URLS ? BACKEND_URLS[operation as keyof typeof BACKEND_URLS] : null;

  if (operation === "getClient" && clientId) {
    url = `${BACKEND_URLS.getClient}/${clientId}`;
  }

  if (operation === "updateOnboardingData" && clientId) {
    url = `${BACKEND_URLS.updateOnboardingData}/${clientId}`;
  }

  if (operation === "listUsers" && clientId) {
    url = `${BACKEND_URLS.listUsers}/${clientId}`;
  }

  if (operation === "getDonationAnalytics" && clientId) {
    url = `${BACKEND_URLS.getDonationAnalytics}/${clientId}`;
  }

  if (!url || (method === "GET" && !READ_OPERATIONS.has(operation as keyof typeof BACKEND_URLS))) {
    return NextResponse.json({ error: "Unsupported ZenRM operation." }, { status: 400 });
  }

  const FALLBACK_URLS: Record<string, string[]> = {
    listCenters: ["/center/zenrm", "/center/zenrm/findAll", "/center/zenrm/entries"],
    listPrograms: ["/program/zenrm", "/program/zenrm/findAll", "/program/zenrm/"],
    listUsers: [`/contact/zenrm/user/${clientId}`, `/user/zenrm/${clientId}`],
    getDonationAnalytics: [
      `/donation/zenrm/analytics/${clientId}`,
      "/donation/zenrm/analytics",
      `/donation/zenrm/analytics?clientId=${clientId}`,
      `/donation/zenrm/analytics?client_id=${clientId}`,
      `/donation/zenrm/findAll/${clientId}`,
      "/donation/zenrm/findAll",
    ],
    getDonation: [
      `/donation/zenrm/findAll/${clientId}`,
      "/donation/zenrm/findAll",
      `/donation/zenrm/${clientId}`,
      "/donation/zenrm",
    ],
  };

  const upstreamMethod = operation === "updateOnboardingData" ? "PATCH" : method;
  console.log(`[ZenRM Route] Forwarding ${upstreamMethod} ${operation} to ${url}`);

  try {
    const response = await apiClient.request({
      url,
      method: upstreamMethod,
      headers: { Authorization: `Bearer ${token}` },
      ...(upstreamMethod !== "GET" ? { data: payload } : {}),
    });

    return NextResponse.json(response.data, { status: response.status });
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404 && operation && FALLBACK_URLS[operation]) {
      for (const fallbackUrl of FALLBACK_URLS[operation]) {
        if (fallbackUrl === url) continue;
        try {
          console.log(`[ZenRM Route] 404 on ${url}, trying fallback ${fallbackUrl}...`);
          const fallbackRes = await apiClient.request({
            url: fallbackUrl,
            method: upstreamMethod,
            headers: { Authorization: `Bearer ${token}` },
            ...(upstreamMethod !== "GET" ? { data: payload } : {}),
          });
          console.log(`[ZenRM Route] Fallback ${fallbackUrl} succeeded (${fallbackRes.status})`);
          return NextResponse.json(fallbackRes.data, { status: fallbackRes.status });
        } catch {
          // continue to next fallback
        }
      }
    }

    if (isAxiosError(error) && error.response?.status === 404) {
      if (operation === "getDonationAnalytics") {
        console.warn(`[ZenRM Route] Upstream returned 404 for getDonationAnalytics. Returning empty analytics data.`);
        return NextResponse.json(
          {
            totalRevenue: 0,
            uniqueDonors: 0,
            amountCollectedByDay: [],
          },
          { status: 200 },
        );
      }

      if (operation === "getDonation") {
        console.warn(`[ZenRM Route] Upstream returned 404 for getDonation. Returning empty donations list.`);
        return NextResponse.json([], { status: 200 });
      }
    }

    if (isAxiosError(error) && error.response) {
      console.error(`[ZenRM Route] ${operation} responded with status ${error.response.status}:`, error.response.data);
      return NextResponse.json(
        {
          error: extractErrorMessage(error.response.data, "The ZenRM request failed.", ["detail", "message", "error"]),
          details: error.response.data,
        },
        { status: error.response.status || 500 },
      );
    }

    console.error(`[ZenRM Route] Network error reaching ZenRM for ${operation}:`, error);
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

export async function PATCH(request: Request) {
  return forwardRequest(request, "PATCH");
}

export async function DELETE(_request: Request) {
  await clearZenrmSessionToken();
  return NextResponse.json({ message: "Logged out successfully" }, { status: 200 });
}
