export class AiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiError';
  }
}

/** @deprecated Use AiError */
export { AiError as GeminiError };
