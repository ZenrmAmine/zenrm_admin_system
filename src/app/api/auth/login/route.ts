import { NextResponse } from "next/server";

import { isAxiosError } from "axios";

import { apiClient, extractErrorMessage } from "@/lib/api-client";
import { ZENRM_SESSION_COOKIE } from "@/lib/auth/session";

function findToken(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;

  const tokenKeys = ["token", "access_token", "accessToken", "jwt", "bearerToken", "authToken"];

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

  let payload: unknown;

  try {
    const response = await apiClient.post(
      "/auth/zenrm/login",
      { email, password },
      { headers: { Authorization: "Bearer" } },
    );
    payload = response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return NextResponse.json(
        { error: extractErrorMessage(error.response.data, "Authentication failed.", ["detail"]) },
        { status: error.response.status || 401 },
      );
    }
    throw error;
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
