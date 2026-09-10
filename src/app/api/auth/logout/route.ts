import { NextResponse } from "next/server";

import { clearZenrmSessionToken } from "@/lib/auth/session";

export async function POST() {
  await clearZenrmSessionToken();

  return NextResponse.json({ success: true });
}
