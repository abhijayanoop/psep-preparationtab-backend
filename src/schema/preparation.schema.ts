import { z } from "zod";

export const GrowthTrajectorySchema = z.enum([
  "High Growth",
  "Moderate Growth",
  "Stable",
]);

export const HiringStatusSchema = z.enum([
  "High Hiring",
  "Moderate Hiring",
  "Low Hiring",
]);

export const ProgressionLevelSchema = z.enum([
  "Entry",
  "Mid",
  "Senior",
  "Lead",
]);

export const JobGrowthLabelSchema = z.enum(["High", "Moderate", "Low"]);

export const CTCRangeSchema = z
  .object({
    min: z.number().positive(),
    max: z.number().positive(),
  })
  .refine(({ min, max }) => min <= max, {
    message: "ctcRange.min must be less than or equal to ctcRange.max",
  });

export const RoleIdSchema = z
  .string()
  .regex(/^rec_[a-f0-9]{32}$/, "Invalid roleId format");

export const MarketSnapshotSchema = z.object({
  jobDemandPercentage: z.number().min(0).max(100),
  averageCTCLpa: z.number().positive(),
  jobGrowthLabel: JobGrowthLabelSchema,
  ctcRangeLpa: CTCRangeSchema,
});

export const SkillsSchema = z.object({
  technical: z
    .array(z.string().min(1))
    .min(3, "At least 3 technical skills required")
    .max(10, "Too many technical skills — keep it focused"),
  soft: z.array(z.string().min(1)).min(2).max(6),
  tools: z.array(z.string().min(1)).min(2).max(6),
});

export const ProgressionStageSchema = z.object({
  level: ProgressionLevelSchema,
  roleTitle: z.string().min(1),
  experienceRange: z.string().min(1),
  salaryRangeLpa: CTCRangeSchema,
});

export const CompanySchema = z.object({
  name: z.string().min(1),
  hiringStatus: HiringStatusSchema,
});

export const CapstoneProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(20, "Description should be meaningful"),
  deliverables: z
    .array(z.string().min(1))
    .min(3, "At least 3 deliverables per capstone")
    .max(8),
  estimatedDuration: z.string().min(1),
});

export const MilestoneProgressSchema = z.enum([
  "not_started",
  "in_progress",
  "completed",
]);

export const RubricCriterionSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(10),
  requirementType: z.enum(["must_have", "nice_to_have"]),
  evaluationHint: z.string().min(5), // tells Gemini where to look in the code
});

export const EvaluationRubricSchema = z.object({
  criteria: z
    .array(RubricCriterionSchema)
    .min(3, "Rubric needs at least 3 criteria")
    .max(8, "Rubric max 8 criteria to keep feedback focused"),
});

export const CriterionResultSchema = z.object({
  criterionId: z.string().min(1),
  met: z.enum(["yes", "no", "partial"]),
  feedback: z.string().min(1),
});

export const MilestoneEvaluationSchema = z.object({
  verdict: z.enum(["pass", "needs_revision"]),
  overallScore: z.number().min(0).max(100),
  criteriaResults: z.array(CriterionResultSchema).min(1),
  strengths: z.array(z.string()).min(1).max(5),
  improvementAreas: z.array(z.string()).max(5),
  nextStepHint: z.string().min(10).max(300),
});

export const SubmissionAttemptSchema = z.object({
  attemptNumber: z.number().int().positive(),
  submittedAt: z.date(),
  submissionUrl: z.string().url(),
  evaluation: MilestoneEvaluationSchema,
});

export const MilestoneSchema = z.object({
  milestoneNumber: z.number().int().positive(),
  title: z.string().min(1),
  careerReadinessGain: z.number().min(5).max(35),
  conceptsToMaster: z
    .array(z.string().min(1))
    .min(3, "A milestone needs at least 3 concepts")
    .max(8),
  capstoneProject: CapstoneProjectSchema,
  submissionType: z
    .enum(["github_repo", "deployed_url", "github_repo_with_url"])
    .default("github_repo"),
  evaluationRubric: EvaluationRubricSchema.optional(), // optional: filled by Gemini
});

export const PersistedMilestoneSchema = MilestoneSchema.extend({
  progress: MilestoneProgressSchema.default("not_started"),
  submissionAttempts: z.array(SubmissionAttemptSchema).default([]),
});

const _recommendationBaseShape = z.object({
  role: z.string().min(1),
  matchPercentage: z.number().min(50).max(95),
  growthTrajectory: GrowthTrajectorySchema,
  shortDescription: z
    .string()
    .min(50, "Short description should be substantive")
    .max(300, "Short description should fit in a card"),
  marketSnapshot: MarketSnapshotSchema,
  skills: SkillsSchema,
  careerProgression: z
    .array(ProgressionStageSchema)
    .length(4, "Career progression must have exactly 4 stages (E/M/S/L)"),
  topCompanies: z
    .array(CompanySchema)
    .min(3, "Show at least 3 companies")
    .max(8),
  whyThisRoleBlurb: z
    .string()
    .min(50, "Blurb must reference student specifics")
    .max(500),
  milestones: z
    .array(MilestoneSchema)
    .min(3, "At least 3 milestones for meaningful progression")
    .max(6, "More than 6 milestones overwhelms the student"),
});

const _progressionOrderCheck = (data: {
  careerProgression: { level: string }[];
}): boolean => {
  const levels = data.careerProgression.map((p) => p.level);
  const expected = ["Entry", "Mid", "Senior", "Lead"];
  return levels.every((level, idx) => level === expected[idx]);
};

const _progressionOrderOpts = {
  message:
    "Career progression stages must be ordered: Entry → Mid → Senior → Lead",
  path: ["careerProgression"] as const,
};

const _milestoneGainSumCheck = (data: {
  milestones: { careerReadinessGain: number }[];
}): boolean => {
  const totalGain = data.milestones.reduce(
    (sum, m) => sum + m.careerReadinessGain,
    0,
  );
  return totalGain >= 60 && totalGain <= 100;
};

const _milestoneGainSumOpts = {
  message: "Sum of milestone readiness gains should be between 60% and 100%",
  path: ["milestones"] as const,
};

export const GeneratedRecommendationSchema = _recommendationBaseShape
  .refine(_progressionOrderCheck, _progressionOrderOpts)
  .refine(_milestoneGainSumCheck, _milestoneGainSumOpts);

export const GeneratedRecommendationsArraySchema = z
  .array(GeneratedRecommendationSchema)
  .length(4, "Expected exactly 4 career recommendations");

export const PersistedRecommendationSchema = _recommendationBaseShape
  .extend({
    roleId: RoleIdSchema,
    milestones: z.array(PersistedMilestoneSchema).min(3).max(6),
  })
  .refine(_progressionOrderCheck, _progressionOrderOpts)
  .refine(_milestoneGainSumCheck, _milestoneGainSumOpts);

export const PersistedRecommendationsArraySchema = z
  .array(PersistedRecommendationSchema)
  .length(4, "Expected exactly 4 persisted recommendations");

export type GrowthTrajectory = z.infer<typeof GrowthTrajectorySchema>;
export type HiringStatus = z.infer<typeof HiringStatusSchema>;
export type ProgressionLevel = z.infer<typeof ProgressionLevelSchema>;
export type JobGrowthLabel = z.infer<typeof JobGrowthLabelSchema>;
export type CTCRange = z.infer<typeof CTCRangeSchema>;
export type RoleId = z.infer<typeof RoleIdSchema>;

export type MarketSnapshot = z.infer<typeof MarketSnapshotSchema>;
export type Skills = z.infer<typeof SkillsSchema>;
export type ProgressionStage = z.infer<typeof ProgressionStageSchema>;
export type Company = z.infer<typeof CompanySchema>;
export type CapstoneProject = z.infer<typeof CapstoneProjectSchema>;
export type Milestone = z.infer<typeof MilestoneSchema>;
export type MilestoneProgress = z.infer<typeof MilestoneProgressSchema>;
export type PersistedMilestone = z.infer<typeof PersistedMilestoneSchema>;
export type RubricCriterion = z.infer<typeof RubricCriterionSchema>;
export type EvaluationRubric = z.infer<typeof EvaluationRubricSchema>;
export type CriterionResult = z.infer<typeof CriterionResultSchema>;
export type MilestoneEvaluation = z.infer<typeof MilestoneEvaluationSchema>;
export type SubmissionAttempt = z.infer<typeof SubmissionAttemptSchema>;

export type GeneratedRecommendation = z.infer<
  typeof GeneratedRecommendationSchema
>;
export type GeneratedRecommendationsArray = z.infer<
  typeof GeneratedRecommendationsArraySchema
>;
export type PersistedRecommendation = z.infer<
  typeof PersistedRecommendationSchema
>;
export type PersistedRecommendationsArray = z.infer<
  typeof PersistedRecommendationsArraySchema
>;
