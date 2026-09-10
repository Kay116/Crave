import { router } from 'expo-router';

type Href = Parameters<typeof router.replace>[0];

// Go back when there is history to go back to; otherwise fall back to a real
// route. Prevents expo-router's dev-only "GO_BACK was not handled" warning when
// a screen with a back button is opened as the first route (deep link / hard
// refresh on web).
export function goBack(fallback: Href = '/preferences') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
