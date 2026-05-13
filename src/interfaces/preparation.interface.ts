export type ReadinessLabel = "Developing" | "Emerging" | "Ready" | "Advanced";

export interface EnrichedPreparationContext extends StudentPreparationContext {
  careersOfInterest: string[];
  proficientSkills: string[];
  industries: string[];
}

export interface StudentPreparationContext {
  studentId: string;
  studentName: string;
  course: string;
  degree: string;
  specialization: string;
  academicBackground: string;
  marketIndex: number;
  academicIndex: number;
  knowledgeIndex: number;
  skillIndex: number;
  cgpa: number;
  readinessLabel: ReadinessLabel;
  readinessPercentage: number;
  acquiredSkills: string[];
  unverifiedSkills: string[];
  careerIntent: {
    industry: string;
    role: string;
  };

  currentSemester: number;
  generatedAt: Date;
}
