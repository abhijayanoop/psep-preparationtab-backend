export interface CareerRecommendation {
  role: string;
  matchPercentage: number;
  growthTrajectory: "High Growth" | "Moderate Growth" | "Stable";
  shortDescription: string;
  technicalSkills: string[];
  softSkills: string[];
  tools: string[];
  averageCTCLpa: number;
  ctcRangeLpa: {
    min: number;
    max: number;
  };
  whyThisRoleBlurb: string;
}
