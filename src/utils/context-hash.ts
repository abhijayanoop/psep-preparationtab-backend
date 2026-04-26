import { createHash } from "crypto";
import { StudentPreparationContext } from "@interfaces/preparation.interface";

export const hashPreparationContext = (
  context: StudentPreparationContext,
): string => {
  const hashInput = {
    marketIndex: context.marketIndex,
    academicIndex: context.academicIndex,
    knowledgeIndex: context.knowledgeIndex,
    skillIndex: context.skillIndex,
    cgpa: context.cgpa,
    acquiredSkills: [...context.acquiredSkills].sort(),
    unverifiedSkills: [...context.unverifiedSkills].sort(),
    careerIntentIndustry: context.careerIntent.industry,
    careerIntentRole: context.careerIntent.role,
    academicBackground: context.academicBackground,
  };

  const serialized = JSON.stringify(hashInput);
  return createHash("sha256").update(serialized).digest("hex");
};
