import axios from "axios";

import { BASE_URL } from "@/lib/config";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export function extractErrorMessage(data: unknown, fallback: string, keys: string[]): string {
  if (typeof data === "object" && data !== null) {
    for (const key of keys) {
      const value = (data as Record<string, unknown>)[key];
      if (typeof value === "string" && value.length > 0) return value;
    }
  }
  return fallback;
}
