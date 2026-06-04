import { AiError } from './errors';

export function extractJsonString(raw: string): string {
  const trimmed = raw.trim();
  const fence = trimmed.match(/`{3}(?:json)?\s*([\s\S]*?)`{3}/);
  if (fence) return fence[1].trim();

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);

  return trimmed;
}

/** Best-effort close for truncated model JSON. */
export function repairTruncatedJson(jsonStr: string): string {
  let s = jsonStr.trim();
  s = s.replace(/,\s*"[^"]*"?\s*:?\s*("?[^"]*)?$/, '');
  s = s.replace(/,\s*$/, '');

  const stack: string[] = [];
  let inString = false;
  let escape = false;

  for (const ch of s) {
    if (inString) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') stack.push('}');
    else if (ch === '[') stack.push(']');
    else if (ch === '}' || ch === ']') stack.pop();
  }

  if (inString) s += '"';
  while (stack.length) s += stack.pop();
  return s;
}

export function parseModelJson<T>(
  raw: string,
  options?: { finishReason?: string },
): T {
  const jsonStr = extractJsonString(raw);
  const truncated =
    options?.finishReason === 'MAX_TOKENS' ||
    (jsonStr.length > 0 && !jsonStr.trimEnd().endsWith('}'));

  try {
    return JSON.parse(jsonStr) as T;
  } catch (firstError) {
    if (truncated) {
      try {
        return JSON.parse(repairTruncatedJson(jsonStr)) as T;
      } catch {
        /* try original error below */
      }
    }
    const hint = truncated
      ? ' Response may have been cut off — try again or use one-at-a-time mode.'
      : '';
    throw new AiError(
      `Invalid JSON from model${hint} ${firstError instanceof Error ? firstError.message : ''}`.trim(),
    );
  }
}
