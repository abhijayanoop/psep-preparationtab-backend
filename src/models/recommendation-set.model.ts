import { Schema, model } from "mongoose";
import {
  IRecommendationSet,
  RecommendationSetDocument,
} from "@interfaces/recommendation-set.interface";

const CTCRangeSubSchema = new Schema(
  {
    min: { type: Number, required: true },
    max: { type: Number, required: true },
  },
  { _id: false },
);

const MarketSnapshotSubSchema = new Schema(
  {
    jobDemandPercentage: { type: Number, required: true },
    averageCTCLpa: { type: Number, required: true },
    jobGrowthLabel: { type: String, required: true },
    ctcRangeLpa: { type: CTCRangeSubSchema, required: true },
  },
  { _id: false },
);

const SkillsSubSchema = new Schema(
  {
    technical: { type: [String], required: true },
    soft: { type: [String], required: true },
    tools: { type: [String], required: true },
  },
  { _id: false },
);

const ProgressionStageSubSchema = new Schema(
  {
    level: { type: String, required: true },
    roleTitle: { type: String, required: true },
    experienceRange: { type: String, required: true },
    salaryRangeLpa: { type: CTCRangeSubSchema, required: true },
  },
  { _id: false },
);

const CompanySubSchema = new Schema(
  {
    name: { type: String, required: true },
    hiringStatus: { type: String, required: true },
  },
  { _id: false },
);

const CapstoneProjectSubSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    deliverables: { type: [String], required: true },
    estimatedDuration: { type: String, required: true },
  },
  { _id: false },
);

const RubricCriterionSubSchema = new Schema(
  {
    id: { type: String, required: true },
    description: { type: String, required: true },
    requirementType: {
      type: String,
      enum: ["must_have", "nice_to_have"],
      required: true,
    },
    evaluationHint: { type: String, required: true },
  },
  { _id: false },
);

const EvaluationRubricSubSchema = new Schema(
  {
    criteria: { type: [RubricCriterionSubSchema], required: true },
  },
  { _id: false },
);

const CriterionResultSubSchema = new Schema(
  {
    criterionId: { type: String, required: true },
    met: { type: String, enum: ["yes", "no", "partial"], required: true },
    feedback: { type: String, required: true },
  },
  { _id: false },
);

const MilestoneEvaluationSubSchema = new Schema(
  {
    verdict: { type: String, enum: ["pass", "needs_revision"], required: true },
    overallScore: { type: Number, required: true },
    criteriaResults: { type: [CriterionResultSubSchema], required: true },
    strengths: { type: [String], required: true },
    improvementAreas: { type: [String], default: [] },
    nextStepHint: { type: String, required: true },
  },
  { _id: false },
);

const SubmissionAttemptSubSchema = new Schema(
  {
    attemptNumber: { type: Number, required: true },
    submittedAt: { type: Date, required: true },
    submissionUrl: { type: String, required: true },
    evaluation: { type: MilestoneEvaluationSubSchema, required: true },
  },
  { _id: false },
);

const MilestoneSubSchema = new Schema(
  {
    milestoneNumber: { type: Number, required: true },
    title: { type: String, required: true },
    careerReadinessGain: { type: Number, required: true },
    conceptsToMaster: { type: [String], required: true },
    capstoneProject: { type: CapstoneProjectSubSchema, required: true },
    submissionType: {
      type: String,
      enum: ["github_repo", "deployed_url", "github_repo_with_url"],
      default: "github_repo",
    },
    evaluationRubric: { type: EvaluationRubricSubSchema, default: null },
    progress: {
      type: String,
      enum: ["not_started", "in_progress", "completed"],
      default: "not_started",
    },
    submissionAttempts: { type: [SubmissionAttemptSubSchema], default: [] },
  },
  { _id: false },
);

const PersistedRecommendationSubSchema = new Schema(
  {
    roleId: { type: String, required: true },
    role: { type: String, required: true },
    matchPercentage: { type: Number, required: true },
    growthTrajectory: { type: String, required: true },
    shortDescription: { type: String, required: true },
    marketSnapshot: { type: MarketSnapshotSubSchema, required: true },
    skills: { type: SkillsSubSchema, required: true },
    careerProgression: { type: [ProgressionStageSubSchema], required: true },
    topCompanies: { type: [CompanySubSchema], required: true },
    whyThisRoleBlurb: { type: String, required: true },
    milestones: { type: [MilestoneSubSchema], required: true },
  },
  { _id: false },
);

const ContextSnapshotSubSchema = new Schema(
  {
    marketIndex: { type: Number, required: true },
    academicIndex: { type: Number, required: true },
    knowledgeIndex: { type: Number, required: true },
    skillIndex: { type: Number, required: true },
    acquiredSkills: { type: [String], required: true },
    readinessLabel: { type: String, required: true },
  },
  { _id: false },
);

const recommendationSetSchema = new Schema<IRecommendationSet>(
  {
    studentId: {
      type: String,
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    generationVersion: {
      type: Number,
      required: true,
      default: 1,
    },
    recommendations: {
      type: [PersistedRecommendationSubSchema],
      required: true,
      validate: {
        validator: (recs: unknown[]) => recs.length === 4,
        message: "recommendations must contain exactly 4 items",
      },
    },
    contextSnapshot: {
      type: ContextSnapshotSubSchema,
      required: true,
    },
    contextHash: {
      type: String,
      required: true,
    },
    generatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: true },
);

recommendationSetSchema.index({ studentId: 1, isActive: 1 });

const recommendationSetModel = model<RecommendationSetDocument>(
  "RecommendationSet",
  recommendationSetSchema,
);

export default recommendationSetModel;
