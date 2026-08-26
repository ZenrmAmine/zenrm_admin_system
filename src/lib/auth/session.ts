import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const ZENRM_SESSION_COOKIE = "zenrm_session";

export async function getZenrmSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ZENRM_SESSION_COOKIE)?.value ?? null;
}

export async function saveZenrmSessionToken(token: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(ZENRM_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearZenrmSessionToken(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ZENRM_SESSION_COOKIE);
}

export async function requireZenrmSessionToken(): Promise<string> {
  const token = await getZenrmSessionToken();

  if (!token) {
    redirect("/auth/v2/login");
  }

  return token;
}
