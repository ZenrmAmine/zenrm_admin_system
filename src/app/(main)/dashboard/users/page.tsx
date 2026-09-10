import { apiClient } from "@/lib/api-client";
import { getZenrmSessionToken, getZenrmSessionUser } from "@/lib/auth/session";

import { extractRecords, mapBackendUserToUserRow, users as staticUsers } from "./_components/data";
import { Users } from "./_components/users";

export default async function Page() {
  const [sessionUser, sessionToken] = await Promise.all([getZenrmSessionUser(), getZenrmSessionToken()]);

  const clientId = sessionUser?.client_id ?? "CLT-QJM2RL";
  console.log("[Users Page] Session user:", sessionUser?.client_id);
  let initialUsers = staticUsers;

  if (clientId) {
    try {
      console.log("[Users Page] Fetching initial users for clientId:", clientId);
      const headers = sessionToken ? { Authorization: `Bearer ${sessionToken.replace(/^Bearer\s+/i, "")}` } : undefined;
      const { data } = await apiClient.get(`/contact/zenrm/user/${clientId}`, { headers });

      const records = extractRecords(data);
      if (records.length > 0) {
        initialUsers = records.map((record, index) => mapBackendUserToUserRow(record, index));
        console.log("[Users Page] Loaded initial users:", initialUsers);
      }
    } catch (error) {
      console.warn(`[Users Page] Could not load initial users for ${clientId}:`, error);
    }
  }

  return <Users users={initialUsers} clientId={clientId} />;
}
