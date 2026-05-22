export function aiSuccessMessage(key: string, result: unknown): string | null {
  if (result == null) return null;
  if (key === 'newchar') return 'Character draft ready — review and add';
  if (key.startsWith('phrase:')) return 'Line generated';
  if (key === 'nick:missing') return 'Missing nicknames generated';
  if (key === 'nick:default' || key.startsWith('nick:out:')) {
    return 'Nickname generated';
  }
  return 'Generation complete';
}
