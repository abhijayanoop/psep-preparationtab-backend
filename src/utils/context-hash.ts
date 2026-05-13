import { createHash } from "crypto";
import { EnrichedPreparationContext, StudentPreparationContext } from "@interfaces/preparation.interface";

export const hashPreparationContext = (
  context: StudentPreparationContext | EnrichedPreparationContext,
): string => {
  const enriched = context as EnrichedPreparationContext;
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
    careersOfInterest: enriched.careersOfInterest ? [...enriched.careersOfInterest].sort() : [],
    proficientSkills: enriched.proficientSkills ? [...enriched.proficientSkills].sort() : [],
    industries: enriched.industries ? [...enriched.industries].sort() : [],
  };

  const serialized = JSON.stringify(hashInput);
  return createHash("sha256").update(serialized).digest("hex");
};
