import { computeProgress, isStepDataComplete } from "@/lib/onboarding/progress";
import type {
  BankingStepInput,
  ClientInformationInput,
  OrganizationIdentityInput,
  UsersStepInput,
} from "@/lib/onboarding/schemas";
import type { OnboardingRecord, OnboardingStepId } from "@/lib/onboarding/types";

import { randomUUID } from "node:crypto";

export interface OnboardingStore {
  create(): Promise<OnboardingRecord>;
  get(clientId: string): Promise<OnboardingRecord | null>;
  upsertStep(clientId: string, stepId: OnboardingStepId, data: unknown): Promise<OnboardingRecord | null>;
}

type StepInput = {
  "client-information": ClientInformationInput;
  "organization-identity": OrganizationIdentityInput;
  users: UsersStepInput;
  "banking-legal": BankingStepInput;
};

function emptyRecord(clientId: string): OnboardingRecord {
  const now = new Date().toISOString();

  return {
    clientId,
    createdAt: now,
    updatedAt: now,
    progress: 0,
    steps: {
      "client-information": {
        data: { passwordIsSet: false },
        completed: false,
      },
      "organization-identity": {
        data: {},
        completed: false,
      },
      users: {
        data: { users: [] },
        completed: true, // zero additional users is a valid, complete state
      },
      "banking-legal": {
        data: { provider: "stripe", connected: false },
        completed: false,
      },
    },
  };
}

/**
 * In-memory, single-process store for local development and demos. Everything here is lost on
 * server restart, cold start, or when running multiple instances — there is no shared/durable
 * state. Swap this class for one backed by the real ZenRM backend (following the
 * src/app/api/zenrm/route.ts proxy pattern) once onboarding endpoints exist there; nothing
 * outside this file needs to change, since callers only ever go through the `onboardingStore`
 * singleton below.
 *
 * Raw passwords are kept only in `passwordsByClientId`, a map that is never exported and never
 * merged into an `OnboardingRecord` — records only ever carry a `passwordIsSet` boolean. This is
 * plaintext storage suitable for a prototype only; a real backend integration must hash/store
 * credentials through the actual ZenRM auth system, not through this store.
 */
interface ClientPasswords {
  clientInformation?: string;
  users: Map<string, string>;
}

class InMemoryOnboardingStore implements OnboardingStore {
  private records = new Map<string, OnboardingRecord>();
  private passwordsByClientId = new Map<string, ClientPasswords>();

  async create(): Promise<OnboardingRecord> {
    const clientId = randomUUID();
    const record = emptyRecord(clientId);
    this.records.set(clientId, record);
    this.passwordsByClientId.set(clientId, { users: new Map() });

    return record;
  }

  async get(clientId: string): Promise<OnboardingRecord | null> {
    return this.records.get(clientId) ?? null;
  }

  async upsertStep(clientId: string, stepId: OnboardingStepId, data: unknown): Promise<OnboardingRecord | null> {
    const record = this.records.get(clientId);
    if (!record) {
      return null;
    }

    const passwords: ClientPasswords = this.passwordsByClientId.get(clientId) ?? { users: new Map() };
    this.passwordsByClientId.set(clientId, passwords);

    switch (stepId) {
      case "client-information": {
        const input = data as StepInput["client-information"];
        const { password, confirmPassword: _confirmPassword, ...rest } = input;
        if (password) {
          passwords.clientInformation = password;
        }
        record.steps["client-information"].data = {
          ...record.steps["client-information"].data,
          ...rest,
          passwordIsSet: !!passwords.clientInformation,
        };
        break;
      }
      case "organization-identity": {
        const input = data as StepInput["organization-identity"];
        record.steps["organization-identity"].data = {
          ...record.steps["organization-identity"].data,
          ...input,
        };
        break;
      }
      case "users": {
        const input = data as StepInput["users"];
        record.steps.users.data = {
          users: input.users.map((user) => {
            const { password, ...rest } = user;
            if (password) {
              passwords.users.set(user.id, password);
            }
            return { ...rest, passwordIsSet: passwords.users.has(user.id) };
          }),
        };
        break;
      }
      case "banking-legal": {
        const input = data as StepInput["banking-legal"];
        record.steps["banking-legal"].data = {
          ...record.steps["banking-legal"].data,
          ...input,
        };
        break;
      }
    }

    record.steps[stepId].completed = isStepDataComplete(stepId, record);
    record.progress = computeProgress(record);
    record.updatedAt = new Date().toISOString();

    return record;
  }
}

export const onboardingStore: OnboardingStore = new InMemoryOnboardingStore();
