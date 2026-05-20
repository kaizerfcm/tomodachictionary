/** Synthetic email domain — users sign in with username only. */
const AUTH_DOMAIN = 'accounts.tomodachictionary.app';

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
}

export function validateUsername(username: string): string | null {
  if (username.length < 3) return 'Username must be at least 3 characters.';
  if (username.length > 24) return 'Username must be 24 characters or fewer.';
  if (!/^[a-z0-9_]+$/.test(username)) {
    return 'Use only letters, numbers, and underscores.';
  }
  return null;
}

export function usernameToEmail(username: string): string {
  const slug = normalizeUsername(username);
  const err = validateUsername(slug);
  if (err) throw new Error(err);
  return `${slug}@${AUTH_DOMAIN}`;
}

export function emailToDisplayUsername(email: string | undefined): string {
  if (!email) return '';
  const local = email.split('@')[0] ?? '';
  if (email.endsWith(`@${AUTH_DOMAIN}`)) return local;
  return email;
}
