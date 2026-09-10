import { apiClient } from "@/lib/api-client";
import { getZenrmSessionToken, getZenrmSessionUser } from "@/lib/auth/session";

import { type ClientOrgRecord, FALLBACK_CLIENT_DATA } from "./_components/org-profile-types";
import { OrgProfileView } from "./_components/org-profile-view";

export default async function MyOrgProfilePage() {
  const [sessionUser, sessionToken] = await Promise.all([getZenrmSessionUser(), getZenrmSessionToken()]);

  const clientId = sessionUser?.client_id ?? "CLT-B2D3LW";
  let clientData: ClientOrgRecord = FALLBACK_CLIENT_DATA;

  if (clientId) {
    try {
      const headers = sessionToken ? { Authorization: `Bearer ${sessionToken.replace(/^Bearer\s+/i, "")}` } : undefined;
      const response = await apiClient.get<ClientOrgRecord>(`/client/${clientId}`, { headers });
      if (response.data && typeof response.data === "object" && response.data.client_id) {
        clientData = {
          ...FALLBACK_CLIENT_DATA,
          ...response.data,
          onboarding_data: response.data.onboarding_data ?? FALLBACK_CLIENT_DATA.onboarding_data,
        };
      }
    } catch (error) {
      console.warn(`[MyOrgProfilePage] Could not load client record for ${clientId}:`, error);
    }
  }

  return <OrgProfileView initialData={clientData} />;
}
