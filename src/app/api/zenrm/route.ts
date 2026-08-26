import { NextResponse } from "next/server";

import { getZenrmSessionToken } from "@/lib/auth/session";

const BACKEND_URLS = {
  listPrograms: "https://test.zenrm.co/program/zenrm/programs",
  listCenters: "https://test.zenrm.co/center/zenrm/",
  createCampaign: "https://test.zenrm.co/campaign/zenrm/entries/",
  createProgram: "https://test.zenrm.co/program/zenrm/programs",
  createCenter: "https://test.zenrm.co/center/zenrm/create",
  linkPrograms: "https://test.zenrm.co/campaign/zenrm/linkprogramtocampaign",
} as const;

const READ_OPERATIONS = new Set<keyof typeof BACKEND_URLS>(["listPrograms", "listCenters"]);

async function getBearerToken(): Promise<string | null> {
  const token = (await getZenrmSessionToken())?.trim();
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

  const operation = method === "GET" ? new URL(request.url).searchParams.get("operation") : body?.operation;
  const payload = body?.payload ?? {};

  const url = operation && operation in BACKEND_URLS ? BACKEND_URLS[operation as keyof typeof BACKEND_URLS] : null;

  if (!url || (method === "GET" && !READ_OPERATIONS.has(operation as keyof typeof BACKEND_URLS))) {
    return NextResponse.json({ error: "Unsupported ZenRM operation." }, { status: 400 });
  }

  let response: Response;

  try {
    response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      ...(method === "POST" ? { body: JSON.stringify(payload) } : {}),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Unable to reach ZenRM for ${operation}.`,
        details: error instanceof Error ? error.message : String(error),
        upstreamUrl: url,
      },
      { status: 502 },
    );
  }

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
    return NextResponse.json(
      {
        error:
          typeof parsed === "object" && parsed && "detail" in parsed
            ? String((parsed as { detail?: string }).detail)
            : typeof parsed === "object" && parsed && "message" in parsed
              ? String((parsed as { message?: string }).message)
              : typeof parsed === "object" && parsed && "error" in parsed
                ? String((parsed as { error?: string }).error)
                : text || "The ZenRM request failed.",
        details: parsed,
      },
      { status: response.status || 500 },
    );
  }

  return NextResponse.json(parsed, { status: response.status });
}

export async function GET(request: Request) {
  return forwardRequest(request, "GET");
}

export async function POST(request: Request) {
  return forwardRequest(request, "POST");
}
