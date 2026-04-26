// src/services/gemini.service.ts
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { GEMINI_API_KEY, GEMINI_MODEL } from "@config";
import { GeminiException, GeminiErrorCode } from "@exceptions/GeminiException";
import { StudentPreparationContext } from "@interfaces/preparation.interface";
import {
  buildCareerRecommendationPrompt,
  GEMINI_SYSTEM_INSTRUCTION,
} from "@utils/gemini-prompt.util";
import { withRetry } from "@utils/retry.util";
import { logger } from "@utils/logger";
import {
  GeneratedRecommendation,
  GeneratedRecommendationsArraySchema,
} from "@/schema/preparation.schema";

class GeminiService {
  private model: GenerativeModel;

  constructor() {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    this.model = genAI.getGenerativeModel({
      model: GEMINI_MODEL || "gemini-2.0-flash",
      systemInstruction: GEMINI_SYSTEM_INSTRUCTION,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    });
  }

  public async generateCareerRecommendations(
    context: StudentPreparationContext,
  ): Promise<GeneratedRecommendation[]> {
    const prompt = buildCareerRecommendationPrompt(context);

    const rawResponse = await this.callGeminiWithRetry(prompt);
    const parsed = this.parseResponse(rawResponse);

    logger.info(
      `Gemini generated ${parsed.length} recommendations for student ${context.studentId}`,
    );

    return parsed;
  }

  private async callGeminiWithRetry(prompt: string): Promise<string> {
    return withRetry(
      async () => {
        try {
          const result = await this.model.generateContent(prompt);
          const response = result.response;

          // Check for safety blocks
          if (response.promptFeedback?.blockReason) {
            throw new GeminiException(
              GeminiErrorCode.SAFETY_BLOCK,
              `Gemini blocked prompt: ${response.promptFeedback.blockReason}`,
            );
          }

          const text = response.text();

          if (!text || text.trim().length === 0) {
            throw new GeminiException(
              GeminiErrorCode.EMPTY_RESPONSE,
              "Gemini returned empty response",
            );
          }

          return text;
        } catch (error) {
          if (error instanceof GeminiException) throw error;

          const msg = (error as Error).message ?? "";
          if (msg.includes("429") || msg.includes("Too Many Requests")) {
            const retryMatch =
              msg.match(/retry.*?in\s+(\d+(?:\.\d+)?)s/i) ??
              msg.match(/"retryDelay":"(\d+)s"/);
            const retryAfterSec = retryMatch
              ? Math.ceil(parseFloat(retryMatch[1]))
              : undefined;
            throw new GeminiException(
              GeminiErrorCode.RATE_LIMITED,
              `Gemini API rate limit exceeded.${
                retryAfterSec
                  ? ` Retry after ${retryAfterSec}s.`
                  : " Please try again later."
              }`,
              error,
            );
          }

          throw new GeminiException(
            GeminiErrorCode.API_CALL_FAILED,
            `Gemini API call failed: ${msg}`,
            error,
          );
        }
      },
      {
        maxAttempts: 3,
        initialDelayMs: 1000,
        maxDelayMs: 5000,
        shouldRetry: (error) =>
          !(
            error instanceof GeminiException &&
            error.code === GeminiErrorCode.RATE_LIMITED
          ),
        onRetry: (attempt, error) => {
          logger.warn(
            `Gemini call failed (attempt ${attempt}/3): ${
              (error as Error).message
            }`,
          );
        },
      },
    );
  }

  private parseResponse(rawText: string): GeneratedRecommendation[] {
    const cleaned = this.stripCodeFences(rawText);

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(cleaned);
    } catch (error) {
      logger.error(
        `Failed to parse Gemini response as JSON: ${cleaned.substring(0, 200)}`,
      );
      throw new GeminiException(
        GeminiErrorCode.PARSE_FAILURE,
        "Gemini returned non-JSON response",
        { rawResponse: cleaned.substring(0, 500) },
      );
    }

    const validationResult =
      GeneratedRecommendationsArraySchema.safeParse(parsedJson);

    if (!validationResult.success) {
      logger.error(
        `Gemini response failed schema validation: ${JSON.stringify(
          validationResult.error.issues,
        )}`,
      );
      throw new GeminiException(
        GeminiErrorCode.VALIDATION_FAILURE,
        "Gemini response did not match expected schema",
        { issues: validationResult.error.issues },
      );
    }

    return validationResult.data;
  }

  private stripCodeFences(text: string): string {
    return text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
  }
}

export default GeminiService;
