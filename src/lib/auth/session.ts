import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const ZENRM_SESSION_COOKIE = "zenrm_session";

type SessionUser = {
  id: string;
  full_name: string;
  email: string;
  avatar: string;
  role: string;
  client_id?: string;
};

function normalizeSessionUser(payload: Record<string, unknown>): SessionUser | null {
  const candidate = (payload.user as Record<string, unknown>) ?? (payload.data as Record<string, unknown>) ?? payload;
  const user = candidate && typeof candidate === "object" ? candidate : null;

  if (!user) return null;

  const client =
    typeof user.client_id === "object" && user.client_id !== null ? (user.client_id as Record<string, unknown>) : null;

  const id =
    typeof user.user_id === "string"
      ? user.user_id
      : typeof client?.user_id === "string"
        ? client.user_id
        : typeof user.id === "string"
          ? user.id
          : typeof user.sub === "string"
            ? user.sub
            : "session-user";

  const full_name =
    typeof user.full_name === "string"
      ? user.full_name
      : typeof client?.full_name === "string"
        ? client.full_name
        : typeof user.name === "string"
          ? user.name
          : "Guest User";

  const email = typeof user.email === "string" ? user.email : "unknown@example.com";

  const role = typeof user.role === "string" ? user.role : "employee";

  let clientId: string | undefined;
  if (typeof user.client_id === "string") {
    clientId = user.client_id;
  } else if (typeof user.clientId === "string") {
    clientId = user.clientId;
  } else if (typeof client?.client_id === "string") {
    clientId = client.client_id;
  } else if (typeof payload.client_id === "string") {
    clientId = payload.client_id;
  }
  const avatar =
    typeof user.avatar === "string"
      ? user.avatar
      : typeof user.avatar_url === "string"
        ? user.avatar_url
        : typeof user.picture === "string"
          ? user.picture
          : "";

  return {
    id,
    full_name,
    email,
    avatar,
    role,
    client_id: clientId,
  };
}

export async function getZenrmSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ZENRM_SESSION_COOKIE)?.value ?? null;
}

export async function getZenrmSessionUser(): Promise<SessionUser | null> {
  const token = await getZenrmSessionToken();

  if (!token) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8"),
    ) as Record<string, unknown>;
    return normalizeSessionUser(payload);
  } catch {
    return null;
  }
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
