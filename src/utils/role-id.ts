import {
  GeneratedRecommendation,
  PersistedRecommendation,
} from "@/schema/preparation.schema";
import { randomUUID } from "crypto";

export const generateRoleId = (): string => {
  return `rec_${randomUUID().replace(/-/g, "")}`;
};

export const injectRoleIds = (
  generated: GeneratedRecommendation[],
): PersistedRecommendation[] => {
  return generated.map((rec) => ({
    ...rec,
    roleId: generateRoleId(),
  }));
};
