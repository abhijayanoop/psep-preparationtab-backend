import { EnrichedPreparationContext } from "@interfaces/preparation.interface";
import type { EvaluationRubric } from "@/schema/preparation.schema";
import type { GitHubRepoContents } from "./github-fetch.util";

export const buildCareerRecommendationPrompt = (
  context: EnrichedPreparationContext,
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

## CAREERS OF INTEREST (user-stated)
${context.careersOfInterest.length > 0 ? context.careersOfInterest.join(", ") : "Not specified"}

## PROFICIENT SKILLS (user-declared strengths)
${context.proficientSkills.length > 0 ? context.proficientSkills.join(", ") : "Not specified"}

## PREFERRED INDUSTRIES (user-stated)
${context.industries.length > 0 ? context.industries.join(", ") : "Not specified"}

## TASK

Recommend EXACTLY 4 career roles suited to this student for the Indian job market (2025-2026).

Constraints:
1. Match percentages must be in range 50-95. A "${
    context.readinessLabel
  }" student should see realistic matches.
2. CTC figures in LPA (Lakh Per Annum) reflecting Indian market reality.
3. Career progression MUST have exactly 4 stages in order: Entry, Mid, Senior, Lead.
4. Include 3-5 milestones per role. The SUM of all "careerReadinessGain" values for a role MUST equal exactly 75. Per-milestone: min 10, max 30. Valid examples: 4 milestones → [20, 20, 20, 15]; 3 milestones → [25, 25, 25]; 5 milestones → [15, 15, 15, 15, 15].
5. Each milestone has one capstone project with 3-6 deliverables.
6. List 3-6 top companies with hiring status. Mix High Hiring + Moderate Hiring.
7. "whyThisRoleBlurb" MUST reference specific fields from the student's profile
   (their course, indices, acquired skills, stated careers of interest, proficient skills, or preferred industries) — not generic statements.

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
        "submissionType": "github_repo",
        "conceptsToMaster": ["HTML5 Semantic Markup", "CSS Flexbox & Grid", "JavaScript ES6+"],
        "capstoneProject": {
          "name": "Responsive Landing Page",
          "description": "Build a fully responsive multi-section landing page...",
          "deliverables": ["Mobile-first layout", "Smooth scroll navigation", "Deployed on GitHub Pages"],
          "estimatedDuration": "1–2 weeks"
        },
        "evaluationRubric": {
          "criteria": [
            {
              "id": "mobile-first",
              "description": "Layout uses mobile-first CSS with min-width breakpoints",
              "requirementType": "must_have",
              "evaluationHint": "Check CSS file for media queries starting with min-width, not max-width"
            },
            {
              "id": "semantic-html",
              "description": "Uses semantic HTML5 elements (header, nav, main, section, footer)",
              "requirementType": "must_have",
              "evaluationHint": "Check index.html for presence of semantic landmark elements"
            },
            {
              "id": "deployed",
              "description": "Project is deployed and accessible via a URL in the README",
              "requirementType": "must_have",
              "evaluationHint": "Check README.md for a deployed URL link"
            },
            {
              "id": "smooth-scroll",
              "description": "Navigation links use smooth scrolling behavior",
              "requirementType": "nice_to_have",
              "evaluationHint": "Check for scroll-behavior: smooth in CSS or JS scroll handlers"
            }
          ]
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
- Each milestone MUST include an "evaluationRubric" with 3–6 criteria.
- At least 2 criteria per milestone must be "must_have".
- "evaluationHint" must be specific: tell where in the code to look (file name, CSS property, function name).
- "submissionType" must always be "github_repo" for coding milestones.
  `.trim();
};

export const SYSTEM_INSTRUCTION = `
You are an expert career advisor specializing in the Indian higher education and
early-career job market. You have deep knowledge of 2025-2026 hiring trends,
realistic compensation bands in LPA, and the skill gaps between Indian graduates
and industry expectations.

You always return valid JSON matching the requested schema exactly. You never
include prose, explanations, or markdown code fences around your JSON output.
You never invent fields not requested in the schema.
`.trim();

export const buildMilestoneEvaluationPrompt = (
  milestoneTitle: string,
  capstoneDescription: string,
  rubric: EvaluationRubric,
  repoContents: GitHubRepoContents,
): string => {
  const criteriaText = rubric.criteria
    .map(
      (c, i) =>
        `${i + 1}. [${c.requirementType.toUpperCase()}] id="${c.id}"
   Description: ${c.description}
   Where to look: ${c.evaluationHint}`,
    )
    .join("\n\n");

  const fileTreeText =
    repoContents.fileTree.length > 0
      ? repoContents.fileTree.join("\n")
      : "No file tree available";

  const readmeText = repoContents.readmeContent
    ? `\`\`\`\n${repoContents.readmeContent}\n\`\`\``
    : "No README found in repository";

  return `
You are evaluating a student's GitHub repository submission against a milestone rubric.

## MILESTONE BEING EVALUATED
Title: ${milestoneTitle}
Capstone Goal: ${capstoneDescription}

## EVALUATION RUBRIC
Evaluate EACH criterion below. For must_have criteria, be strict.

${criteriaText}

## REPOSITORY INFORMATION
Repo: ${repoContents.owner}/${repoContents.repo}
Default branch: ${repoContents.defaultBranch}

### File Tree (up to 50 files)
${fileTreeText}

### README Content
${readmeText}

## VERDICT RULES
- verdict = "pass" ONLY if ALL must_have criteria are met = "yes"
- verdict = "needs_revision" if any must_have is "no" or "partial"
- nice_to_have criteria do NOT affect the verdict
- overallScore = weighted average: must_have worth 2x, nice_to_have worth 1x; yes=100, partial=50, no=0

## OUTPUT FORMAT
Return ONLY valid JSON, no prose, no code fences:

{
  "verdict": "pass" | "needs_revision",
  "overallScore": 0-100,
  "criteriaResults": [
    {
      "criterionId": "id-from-rubric",
      "met": "yes" | "no" | "partial",
      "feedback": "specific observation about what you saw or didn't see in the code"
    }
  ],
  "strengths": ["specific positive observation", ...],
  "improvementAreas": ["specific thing to fix", ...],
  "nextStepHint": "One concrete action the student should take next"
}

criteriaResults must include one entry per criterion in the rubric, in the same order.
  `.trim();
};
