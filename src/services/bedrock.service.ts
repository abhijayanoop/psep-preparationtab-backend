import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { AWS_REGION_SONNET, BEDROCK_MODEL_SONNET } from "@config";
import { GeminiException, GeminiErrorCode } from "@exceptions/GeminiException";
import { StudentPreparationContext } from "@interfaces/preparation.interface";
import {
  buildCareerRecommendationPrompt,
  SYSTEM_INSTRUCTION,
} from "@utils/gemini-prompt.util";
import { withRetry } from "@utils/retry.util";
import { logger } from "@utils/logger";
import {
  GeneratedRecommendation,
  GeneratedRecommendationsArraySchema,
} from "@/schema/preparation.schema";

class GeminiService {
  private client: BedrockRuntimeClient;
  private modelId: string;

  constructor() {
    this.client = new BedrockRuntimeClient({
      region: AWS_REGION_SONNET || "ap-south-1",
    });
    this.modelId =
      BEDROCK_MODEL_SONNET || "apac.anthropic.claude-sonnet-4-20250514-v1:0";
  }

  public async generateCareerRecommendations(
    context: StudentPreparationContext,
  ): Promise<GeneratedRecommendation[]> {
    const prompt = buildCareerRecommendationPrompt(context);
    const rawResponse = await this.callBedrockWithRetry(prompt);
    const parsed = this.parseResponse(rawResponse);

    logger.info(
      `Bedrock generated ${parsed.length} recommendations for student ${context.studentId}`,
    );

    return parsed;
  }

  private async callBedrockWithRetry(prompt: string): Promise<string> {
    return withRetry(
      async () => {
        try {
          const result = await this.client.send(
            new ConverseCommand({
              modelId: this.modelId,
              messages: [
                {
                  role: "user",
                  content: [{ text: prompt }],
                },
              ],
              system: [{ text: SYSTEM_INSTRUCTION }],
              inferenceConfig: {
                maxTokens: 16000,
                temperature: 0.7,
                topP: 0.95,
              },
            }),
          );

          const text = result.output?.message?.content?.[0]?.text;

          if (!text || text.trim().length === 0) {
            throw new GeminiException(
              GeminiErrorCode.EMPTY_RESPONSE,
              "Bedrock returned empty response",
            );
          }

          return text;
        } catch (error) {
          if (error instanceof GeminiException) throw error;

          const msg = (error as Error).message ?? "";

          if (
            msg.includes("429") ||
            msg.includes("Too Many Requests") ||
            msg.includes("ThrottlingException")
          ) {
            throw new GeminiException(
              GeminiErrorCode.RATE_LIMITED,
              `Bedrock API rate limit exceeded. Please try again later.`,
              error,
            );
          }

          throw new GeminiException(
            GeminiErrorCode.API_CALL_FAILED,
            `Bedrock API call failed: ${msg}`,
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
            `Bedrock call failed (attempt ${attempt}/3): ${
              (error as Error).message
            }`,
          );
        },
      },
    );
  }

  private parseResponse(rawText: string): GeneratedRecommendation[] {
    const cleaned = this.stripCodeFences(rawText);

    logger.debug(`Bedrock raw response (${cleaned.length} chars):\n${cleaned}`);

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(cleaned);
    } catch (error) {
      // Claude sometimes wraps in an object — try extracting the array
      const start = cleaned.indexOf("[");
      const end = cleaned.lastIndexOf("]");
      if (start !== -1 && end !== -1) {
        try {
          parsedJson = JSON.parse(cleaned.substring(start, end + 1));
        } catch {
          logger.error(
            `Failed to parse Bedrock response as JSON (${cleaned.length} chars):\n${cleaned}`,
          );
          throw new GeminiException(
            GeminiErrorCode.PARSE_FAILURE,
            "Bedrock returned non-JSON response",
            { rawResponse: cleaned.substring(0, 500) },
          );
        }
      } else {
        logger.error(
          `Failed to parse Bedrock response as JSON (${cleaned.length} chars):\n${cleaned}`,
        );
        throw new GeminiException(
          GeminiErrorCode.PARSE_FAILURE,
          "Bedrock returned non-JSON response",
          { rawResponse: cleaned.substring(0, 500) },
        );
      }
    }

    if (Array.isArray(parsedJson)) {
      parsedJson = this.normalizeReadinessGains(parsedJson);
    }

    const validationResult =
      GeneratedRecommendationsArraySchema.safeParse(parsedJson);

    if (!validationResult.success) {
      logger.error(
        `Bedrock response failed schema validation: ${JSON.stringify(
          validationResult.error.issues,
        )}`,
      );
      throw new GeminiException(
        GeminiErrorCode.VALIDATION_FAILURE,
        "Bedrock response did not match expected schema",
        { issues: validationResult.error.issues },
      );
    }

    return validationResult.data;
  }

  private normalizeReadinessGains(recs: unknown[]): unknown[] {
    return (recs as any[]).map((rec) => {
      if (!Array.isArray(rec?.milestones)) return rec;
      const milestones: any[] = rec.milestones;
      const total = milestones.reduce(
        (s, m) => s + (Number(m.careerReadinessGain) || 0),
        0,
      );
      if (total >= 60 && total <= 100) return rec;

      const target = 75;
      const scale = total > 0 ? target / total : 1;
      let normalized = milestones.map((m) => ({
        ...m,
        careerReadinessGain: Math.min(
          35,
          Math.max(5, Math.round(m.careerReadinessGain * scale)),
        ),
      }));

      const newTotal = normalized.reduce(
        (s, m) => s + m.careerReadinessGain,
        0,
      );
      if (newTotal < 60 || newTotal > 100) {
        const even = Math.round(target / normalized.length);
        normalized = normalized.map((m) => ({
          ...m,
          careerReadinessGain: Math.min(35, Math.max(5, even)),
        }));
      }

      logger.info(
        `Normalized readiness gains for role "${rec.role}": ${total} → ${normalized.reduce((s, m) => s + m.careerReadinessGain, 0)}`,
      );
      return { ...rec, milestones: normalized };
    });
  }

  private stripCodeFences(text: string): string {
    return text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
  }
}

export default GeminiService;
