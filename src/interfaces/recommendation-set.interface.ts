import { PersistedRecommendation } from "@/schema/preparation.schema";
import { Document } from "mongoose";

export interface IContextSnapshot {
  marketIndex: number;
  academicIndex: number;
  knowledgeIndex: number;
  skillIndex: number;
  acquiredSkills: string[];
  readinessLabel: string;
}

export interface IRecommendationSet {
  _id?: string;
  studentId: string;
  isActive: boolean;
  generationVersion: number;
  recommendations: PersistedRecommendation[];
  contextSnapshot: IContextSnapshot;
  contextHash: string;
  generatedAt: Date;
}

export type RecommendationSetDocument = IRecommendationSet & Document;
