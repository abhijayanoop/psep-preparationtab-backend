import { HttpException } from "./HttpException";

export enum GeminiErrorCode {
  API_CALL_FAILED = "GEMINI_API_CALL_FAILED",
  PARSE_FAILURE = "GEMINI_PARSE_FAILURE",
  VALIDATION_FAILURE = "GEMINI_VALIDATION_FAILURE",
  TIMEOUT = "GEMINI_TIMEOUT",
  SAFETY_BLOCK = "GEMINI_SAFETY_BLOCK",
  EMPTY_RESPONSE = "GEMINI_EMPTY_RESPONSE",
  RATE_LIMITED = "GEMINI_RATE_LIMITED",
}

const ERROR_HTTP_STATUS: Record<GeminiErrorCode, number> = {
  [GeminiErrorCode.API_CALL_FAILED]: 502,
  [GeminiErrorCode.PARSE_FAILURE]: 502,
  [GeminiErrorCode.VALIDATION_FAILURE]: 502,
  [GeminiErrorCode.TIMEOUT]: 504,
  [GeminiErrorCode.SAFETY_BLOCK]: 400,
  [GeminiErrorCode.EMPTY_RESPONSE]: 502,
  [GeminiErrorCode.RATE_LIMITED]: 429,
};

export class GeminiException extends HttpException {
  public code: GeminiErrorCode;
  public details?: unknown;

  constructor(code: GeminiErrorCode, message: string, details?: unknown) {
    super(ERROR_HTTP_STATUS[code] ?? 502, message);
    this.code = code;
    this.details = details;
  }
}
