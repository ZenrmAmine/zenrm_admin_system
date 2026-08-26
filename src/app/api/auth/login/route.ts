import { NextResponse } from "next/server";

import { ZENRM_SESSION_COOKIE } from "@/lib/auth/session";

function findToken(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;

  const tokenKeys = [
    "token",
    "access_token",
    "accessToken",
    "jwt",
    "bearerToken",
    "authToken",
  ];

  for (const key of tokenKeys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  for (const nestedKey of ["data", "result", "payload", "user"]) {
    const nestedValue = record[nestedKey];
    if (nestedValue && typeof nestedValue === "object") {
      const nestedToken = findToken(nestedValue);
      if (nestedToken) {
        return nestedToken;
      }
    }
  }

  return null;
}

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim();
  const password = body.password?.trim();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const response = await fetch("https://test.zenrm.co/auth/zenrm/login", {
    method: "POST",
    headers: {
      Authorization: "Bearer",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const text = await response.text();
  let payload: unknown = {};

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }
  }

  if (!response.ok) {
    return NextResponse.json(
      {
        error: typeof payload === "object" && payload && "detail" in payload ? String((payload as { detail?: string }).detail) : text || "Authentication failed.",
      },
      { status: response.status || 401 },
    );
  }

  const token = findToken(payload);

  if (!token) {
    return NextResponse.json({ error: "No bearer token returned by the backend." }, { status: 500 });
  }

  const nextResponse = NextResponse.json({ success: true, message: "Logged in successfully." });
  nextResponse.cookies.set(ZENRM_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return nextResponse;
}
