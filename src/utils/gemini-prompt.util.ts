import { StudentPreparationContext } from "@interfaces/preparation.interface";

export const buildCareerRecommendationPrompt = (
  context: StudentPreparationContext,
): string => {
  return `
You are generating career recommendations for a student in the Indian higher education market.

## STUDENT PROFILE

- Academic background: ${context.academicBackground}
- Current semester: ${context.currentSemester}
- CGPA: ${context.cgpa}
- Market readiness index: ${context.marketIndex}/100 (tier: ${
    context.readinessLabel
  })
- Academic index: ${context.academicIndex}/100
- Knowledge index: ${context.knowledgeIndex}/100
- Skill index: ${context.skillIndex}/100

## ACQUIRED SKILLS (verified)
${
  context.acquiredSkills.length > 0
    ? context.acquiredSkills.join(", ")
    : "None recorded"
}

## UNVERIFIED SKILLS (self-reported)
${
  context.unverifiedSkills.length > 0
    ? context.unverifiedSkills.join(", ")
    : "None recorded"
}

## STATED CAREER INTENT
- Industry: ${context.careerIntent.industry || "Not specified"}
- Target role: ${context.careerIntent.role || "Not specified"}

## TASK

Recommend EXACTLY 4 career roles suited to this student for the Indian job market (2025-2026).

Constraints:
1. Match percentages must be in range 50-95. A "${
    context.readinessLabel
  }" student should see realistic matches.
2. CTC figures in LPA (Lakh Per Annum) reflecting Indian market reality.
3. Career progression MUST have exactly 4 stages in order: Entry, Mid, Senior, Lead.
4. Include 3-5 milestones per role. Each milestone gains 15-25% readiness. Total across all milestones should be 60-100%.
5. Each milestone has one capstone project with 3-6 deliverables.
6. List 3-6 top companies with hiring status. Mix High Hiring + Moderate Hiring.
7. "whyThisRoleBlurb" MUST reference specific fields from the student's profile
   (their course, indices, or acquired skills) — not generic statements.

## OUTPUT FORMAT

Return ONLY a valid JSON array. No prose, no markdown, no commentary.
Array must contain exactly 4 objects matching this structure:

[
  {
    "role": "Frontend Developer",
    "matchPercentage": 73,
    "growthTrajectory": "High Growth",
    "shortDescription": "Design and build interactive web interfaces using modern JavaScript frameworks.",
    "marketSnapshot": {
      "jobDemandPercentage": 78,
      "averageCTCLpa": 6.2,
      "jobGrowthLabel": "High",
      "ctcRangeLpa": { "min": 4, "max": 8 }
    },
    "skills": {
      "technical": ["React.js", "JavaScript", "HTML/CSS", "REST APIs", "Git"],
      "soft": ["Problem Solving", "Attention to Detail", "Collaboration"],
      "tools": ["VS Code", "Figma", "Chrome DevTools"]
    },
    "careerProgression": [
      { "level": "Entry",  "roleTitle": "Junior Frontend Dev",   "experienceRange": "0–1 yr", "salaryRangeLpa": { "min": 4,  "max": 5  } },
      { "level": "Mid",    "roleTitle": "Frontend Developer",    "experienceRange": "2–4 yr", "salaryRangeLpa": { "min": 6,  "max": 10 } },
      { "level": "Senior", "roleTitle": "Senior Frontend Dev",   "experienceRange": "5–7 yr", "salaryRangeLpa": { "min": 12, "max": 20 } },
      { "level": "Lead",   "roleTitle": "Engineering Manager",   "experienceRange": "8+ yr",  "salaryRangeLpa": { "min": 22, "max": 35 } }
    ],
    "topCompanies": [
      { "name": "TCS",       "hiringStatus": "High Hiring" },
      { "name": "Infosys",   "hiringStatus": "High Hiring" },
      { "name": "Wipro",     "hiringStatus": "Moderate Hiring" }
    ],
    "whyThisRoleBlurb": "With your market readiness at ${
      context.marketIndex
    }% and your ${
    context.academicBackground
  } background, frontend development aligns with your acquired skills...",
    "milestones": [
      {
        "milestoneNumber": 1,
        "title": "HTML, CSS & JavaScript Foundations",
        "careerReadinessGain": 20,
        "conceptsToMaster": ["HTML5 Semantic Markup", "CSS Flexbox & Grid", "JavaScript ES6+", "DOM Manipulation", "Responsive Design Principles"],
        "capstoneProject": {
          "name": "Responsive Landing Page",
          "description": "Build a fully responsive multi-section landing page for a fictional product using semantic HTML, modern CSS layouts, and vanilla JavaScript for interactivity.",
          "deliverables": ["Mobile-first layout", "Smooth scroll navigation", "Interactive UI elements", "Deployed on GitHub Pages"],
          "estimatedDuration": "1–2 weeks"
        }
      }
    ]
  }
]

## CRITICAL RULES

- Career progression levels MUST be exactly in order: Entry, Mid, Senior, Lead (never skip, never reorder).
- growthTrajectory MUST be one of: "High Growth", "Moderate Growth", "Stable".
- jobGrowthLabel MUST be one of: "High", "Moderate", "Low".
- hiringStatus MUST be one of: "High Hiring", "Moderate Hiring", "Low Hiring".
- All CTC ranges must satisfy min <= max.
- Every blurb must reference the student's specific profile data.
  `.trim();
};

export const GEMINI_SYSTEM_INSTRUCTION = `
You are an expert career advisor specializing in the Indian higher education and
early-career job market. You have deep knowledge of 2025-2026 hiring trends,
realistic compensation bands in LPA, and the skill gaps between Indian graduates
and industry expectations.

You always return valid JSON matching the requested schema exactly. You never
include prose, explanations, or markdown code fences around your JSON output.
You never invent fields not requested in the schema.
`.trim();
