import { HttpException } from "@exceptions/HttpException";
import { GeminiException, GeminiErrorCode } from "@exceptions/GeminiException";
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { GEMINI_API_KEY, GEMINI_MODEL } from "@config";
import {
  MilestoneEvaluation,
  MilestoneEvaluationSchema,
  SubmissionAttempt,
} from "@/schema/preparation.schema";
import recommendationSetModel from "@/models/recommendation-set.model";
import {
  buildMilestoneEvaluationPrompt,
  GEMINI_SYSTEM_INSTRUCTION,
} from "@utils/gemini-prompt.util";
import { fetchGitHubRepoContents } from "@utils/github-fetch.util";
import { logger } from "@utils/logger";

const ATTEMPTS_PER_DAY = 3;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

class MilestoneEvaluationService {
  private model: GenerativeModel;

  constructor() {
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    this.model = genAI.getGenerativeModel({
      model: GEMINI_MODEL || "gemini-2.0-flash",
      systemInstruction: GEMINI_SYSTEM_INSTRUCTION,
      generationConfig: {
        temperature: 0.2, // low temp for deterministic evaluation
        topP: 0.9,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      },
    });
  }

  //Main entry point: submit a repo URL for milestone evaluation.
  public async submitForEvaluation(
    studentId: string,
    roleId: string,
    milestoneNumber: number,
    submissionUrl: string,
  ): Promise<{ attempt: SubmissionAttempt; progressUpdated: boolean }> {
    const set = await recommendationSetModel.findOne({
      studentId,
      isActive: true,
    });

    if (!set) {
      throw new HttpException(404, "No active recommendation set found");
    }

    const recommendation = set.recommendations.find(
      (r: any) => r.roleId === roleId,
    );
    if (!recommendation) {
      throw new HttpException(
        404,
        "Role not found in active recommendation set",
      );
    }

    const milestone = recommendation.milestones.find(
      (m: any) => m.milestoneNumber === milestoneNumber,
    );
    if (!milestone) {
      throw new HttpException(404, `Milestone ${milestoneNumber} not found`);
    }

    if (milestone.progress === "completed") {
      throw new HttpException(
        409,
        "Milestone already completed. No further submissions accepted.",
      );
    }

    const cutoff = new Date(Date.now() - ONE_DAY_MS);
    const recentAttempts = (milestone.submissionAttempts ?? []).filter(
      (a: any) => new Date(a.submittedAt) > cutoff,
    );
    if (recentAttempts.length >= ATTEMPTS_PER_DAY) {
      throw new HttpException(
        429,
        `Maximum ${ATTEMPTS_PER_DAY} submission attempts per 24 hours reached for this milestone.`,
      );
    }

    if (
      !milestone.evaluationRubric ||
      !milestone.evaluationRubric.criteria?.length
    ) {
      throw new HttpException(
        422,
        "Milestone has no evaluation rubric. Regenerate your recommendation set.",
      );
    }

    logger.info(
      `Fetching repo for student ${studentId}, milestone ${milestoneNumber}: ${submissionUrl}`,
    );
    const repoContents = await fetchGitHubRepoContents(submissionUrl);

    const prompt = buildMilestoneEvaluationPrompt(
      milestone.title,
      milestone.capstoneProject.description,
      milestone.evaluationRubric,
      repoContents,
    );

    const evaluation = await this.callGeminiForEvaluation(prompt);

    const attemptNumber = (milestone.submissionAttempts ?? []).length + 1;
    const attempt: SubmissionAttempt = {
      attemptNumber,
      submittedAt: new Date(),
      submissionUrl,
      evaluation,
    };

    const progressUpdated = evaluation.verdict === "pass";
    const newProgress = progressUpdated ? "completed" : "in_progress";

    await recommendationSetModel.updateOne(
      { studentId, isActive: true, "recommendations.roleId": roleId },
      {
        $push: {
          "recommendations.$[rec].milestones.$[ms].submissionAttempts": attempt,
        },
        $set: {
          "recommendations.$[rec].milestones.$[ms].progress": newProgress,
        },
      },
      {
        arrayFilters: [
          { "rec.roleId": roleId },
          { "ms.milestoneNumber": milestoneNumber },
        ],
      },
    );

    logger.info(
      `Evaluation complete for student ${studentId}, milestone ${milestoneNumber}: ` +
        `verdict=${evaluation.verdict}, score=${evaluation.overallScore}, attempt=${attemptNumber}`,
    );

    return { attempt, progressUpdated };
  }

  //Returns all submission attempts for a milestone
  public async getSubmissionHistory(
    studentId: string,
    roleId: string,
    milestoneNumber: number,
  ): Promise<SubmissionAttempt[]> {
    const set = await recommendationSetModel
      .findOne({ studentId, isActive: true })
      .lean();

    if (!set) return [];

    const recommendation = set.recommendations.find(
      (r: any) => r.roleId === roleId,
    );
    if (!recommendation) return [];

    const milestone = recommendation.milestones.find(
      (m: any) => m.milestoneNumber === milestoneNumber,
    );
    if (!milestone) return [];

    return milestone.submissionAttempts ?? [];
  }

  private async callGeminiForEvaluation(
    prompt: string,
  ): Promise<MilestoneEvaluation> {
    let rawText: string;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;

      if (response.promptFeedback?.blockReason) {
        throw new GeminiException(
          GeminiErrorCode.SAFETY_BLOCK,
          `Gemini blocked evaluation prompt: ${response.promptFeedback.blockReason}`,
        );
      }

      rawText = response.text();
      if (!rawText?.trim()) {
        throw new GeminiException(
          GeminiErrorCode.EMPTY_RESPONSE,
          "Gemini returned empty evaluation",
        );
      }
    } catch (error) {
      if (error instanceof GeminiException) throw error;
      throw new GeminiException(
        GeminiErrorCode.API_CALL_FAILED,
        `Gemini evaluation API call failed: ${(error as Error).message}`,
        error,
      );
    }

    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new GeminiException(
        GeminiErrorCode.PARSE_FAILURE,
        "Gemini evaluation returned non-JSON response",
        { raw: cleaned.slice(0, 300) },
      );
    }

    const validated = MilestoneEvaluationSchema.safeParse(parsed);
    if (!validated.success) {
      throw new GeminiException(
        GeminiErrorCode.VALIDATION_FAILURE,
        "Gemini evaluation response failed schema validation",
        { issues: validated.error.issues },
      );
    }

    return validated.data;
  }
}

export default MilestoneEvaluationService;
