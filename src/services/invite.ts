// Pure invitation-message helpers (no RN imports) so they can be unit-tested and
// reused by the sharing layer.

// A usable public URL is https and not a localhost / private-LAN address, which
// would be a dead link for anyone else. Otherwise callers share the code alone.
export function normalizePublicUrl(raw: string | undefined | null): string | null {
  const value = (raw ?? '').trim().replace(/\/+$/, '');
  if (!/^https:\/\//i.test(value)) return null;
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0|\b10\.|\b192\.168\.|\b172\.(1[6-9]|2\d|3[01])\./i.test(value)) return null;
  return value;
}

export function roomInviteUrl(code: string, appUrl: string | undefined | null = process.env.EXPO_PUBLIC_APP_URL): string | null {
  const base = normalizePublicUrl(appUrl);
  return base ? `${base}/room/${encodeURIComponent(code)}` : null;
}

export function buildRoomInviteMessage(
  roomName: string,
  code: string,
  appUrl: string | undefined | null = process.env.EXPO_PUBLIC_APP_URL,
): string {
  const url = roomInviteUrl(code, appUrl);
  const name = roomName.trim() || 'Crave room';
  const lines = [
    `Join my Crave room "${name}" so we can pick where to eat together.`,
    `Invitation code: ${code}`,
  ];
  if (url) lines.push(`Open: ${url}`);
  lines.push(
    url
      ? `No link? Open Crave, tap Friends, and enter the code ${code}.`
      : `Open Crave, tap Friends → Join a room, and enter the code ${code}.`,
  );
  return lines.join('\n');
}
