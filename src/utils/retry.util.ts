interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  onRetry?: (attempt: number, error: unknown) => void;
  shouldRetry?: (error: unknown) => boolean;
}

export const withRetry = async <T>(
  operation: () => Promise<T>,
  options: RetryOptions,
): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt >= options.maxAttempts) {
        break;
      }

      if (options.shouldRetry && !options.shouldRetry(error)) {
        break;
      }

      const delay = Math.min(
        options.initialDelayMs * Math.pow(2, attempt - 1),
        options.maxDelayMs,
      );

      options.onRetry?.(attempt, error);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};
