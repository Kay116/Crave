import * as Linking from 'expo-linking';
import { Platform, Share } from 'react-native';
import { buildRoomInviteMessage, normalizePublicUrl, roomInviteUrl } from '@/services/invite';
import { Dish } from '@/types';

export { buildRoomInviteMessage, roomInviteUrl } from '@/services/invite';
export const publicAppUrl = () => normalizePublicUrl(process.env.EXPO_PUBLIC_APP_URL);

export type ShareOutcome = 'shared' | 'copied' | 'dismissed' | 'unavailable';

type WebNavigator = {
  share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
  clipboard?: { writeText?: (text: string) => Promise<void> };
};

const webNavigator = () => (typeof navigator !== 'undefined' ? (navigator as WebNavigator) : undefined);

// Last-resort clipboard write for contexts where navigator.clipboard is blocked
// (e.g. a cross-origin iframe without clipboard-write permission).
function legacyCopy(text: string): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

export async function copyText(text: string): Promise<boolean> {
  if (Platform.OS !== 'web') {
    return shareText({ message: text }).then((r) => r === 'shared');
  }
  const nav = webNavigator();
  if (nav?.clipboard?.writeText) {
    try {
      await nav.clipboard.writeText(text);
      return true;
    } catch {
      /* fall through */
    }
  }
  return legacyCopy(text);
}

async function shareOnWeb(title: string | undefined, message: string, url?: string): Promise<ShareOutcome> {
  const nav = webNavigator();
  const full = url ? `${message}\n${url}` : message;
  if (nav?.share) {
    try {
      await nav.share({ title, text: message, url });
      return 'shared';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'dismissed';
      // otherwise fall back to copying
    }
  }
  if (nav?.clipboard?.writeText) {
    try {
      await nav.clipboard.writeText(full);
      return 'copied';
    } catch {
      /* fall through */
    }
  }
  return legacyCopy(full) ? 'copied' : 'unavailable';
}

export async function shareText(opts: { title?: string; message: string; url?: string }): Promise<ShareOutcome> {
  if (Platform.OS === 'web') return shareOnWeb(opts.title, opts.message, opts.url);
  try {
    const payload = opts.url && Platform.OS === 'ios'
      ? { title: opts.title, message: opts.message, url: opts.url }
      : { title: opts.title, message: opts.url ? `${opts.message}\n${opts.url}` : opts.message };
    const result = await Share.share(payload);
    return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
  } catch {
    return 'unavailable';
  }
}

export const shareRoomInvite = (roomName: string, code: string) =>
  shareText({ title: `Crave room: ${roomName}`, message: buildRoomInviteMessage(roomName, code), url: roomInviteUrl(code) ?? undefined });

export const shareDish = (dish: Dish) =>
  shareText({ title: dish.name, message: `Crave pick: ${dish.name} — ${dish.cuisine}. ${dish.description}` });

export const shareSoloResult = (dish: Dish, matchPercent: number) =>
  shareText({ title: dish.name, message: `Crave says tonight is ${dish.name}: a ${matchPercent}% match for my mood right now.` });

export const shareGroupResult = (roomName: string, dish: Dish, likedBy: number, totalMembers: number) =>
  shareText({
    title: dish.name,
    message: `Our Crave room "${roomName}" landed on ${dish.name} — ${likedBy} of ${totalMembers} of us liked it.`,
  });

export const shareRestaurant = (name: string, mapsUrl: string) =>
  shareText({ title: name, message: `Let's try ${name} for our Crave pick.`, url: mapsUrl });

// Deep link used for confirmation emails etc. lives in auth-context; re-exported
// here so callers have one sharing entrypoint.
export const appDeepLink = (path: string) => Linking.createURL(path);
