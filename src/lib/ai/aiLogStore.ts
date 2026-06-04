const STORAGE_KEY = 'tomodict-ai-logs-v1';
const MAX_LOGS = 40;

export type AiLogStatus = 'ok' | 'error';

export interface AiLogRequest {
  model: string;
  maxOutputTokens: number;
  body: unknown;
}

export interface AiLogResponse {
  text: string;
  finishReason?: string;
}

export interface AiLogEntry {
  id: string;
  timestamp: number;
  operation: string;
  prompt: string;
  request: AiLogRequest;
  response?: AiLogResponse;
  error?: string;
  durationMs: number;
  status: AiLogStatus;
}

function readLogs(): AiLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AiLogEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLogs(logs: AiLogEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch {
    /* drop oldest entries until write succeeds */
    if (logs.length <= 1) return;
    writeLogs(logs.slice(0, Math.ceil(logs.length / 2)));
  }
}

export function listAiLogs(): AiLogEntry[] {
  return readLogs();
}

export function appendAiLog(entry: AiLogEntry): void {
  const logs = readLogs();
  logs.unshift(entry);
  writeLogs(logs.slice(0, MAX_LOGS));
}

export function clearAiLogs(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function downloadAiLogsJson(): void {
  const blob = new Blob([JSON.stringify(listAiLogs(), null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tomodict-ai-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
