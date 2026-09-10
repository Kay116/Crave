import { Image, ImageContentFit, ImageStyle } from 'expo-image';
import { useState } from 'react';
import { StyleProp } from 'react-native';
import { FALLBACK_DISH_IMAGE } from '@/data/dishes';

// Warm neutral blur placeholder so cards never flash empty while a photo loads.
const PLACEHOLDER_BLURHASH = 'L6Pj0^i_.AyE_3t7t7R**0o#DgR4';

type Props = {
  uri: string;
  alt?: string;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  transition?: number;
  priority?: 'low' | 'normal' | 'high';
  recyclingKey?: string;
};

// expo-image with disk+memory caching, a placeholder, and a reliable fallback:
// if the real photo 404s or times out, we swap to a known-good image instead of
// leaving a broken card.
export function SmartImage({ uri, alt, style, contentFit = 'cover', transition = 220, priority = 'normal', recyclingKey }: Props) {
  // Track the specific URI that failed so a new `uri` prop automatically clears
  // the fallback without a reset effect.
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const failed = failedUri !== null && failedUri === uri;
  return (
    <Image
      accessible={Boolean(alt)}
      accessibilityLabel={alt}
      accessibilityRole="image"
      source={failed || !uri ? FALLBACK_DISH_IMAGE : uri}
      style={style}
      contentFit={contentFit}
      transition={transition}
      cachePolicy="memory-disk"
      placeholder={{ blurhash: PLACEHOLDER_BLURHASH }}
      placeholderContentFit="cover"
      priority={priority}
      recyclingKey={recyclingKey ?? uri}
      onError={() => setFailedUri(uri)}
    />
  );
}

// Warm only the next few dish images rather than the whole catalogue.
export function prefetchDishImages(urls: string[], count = 4) {
  const slice = urls.filter(Boolean).slice(0, count);
  if (slice.length) Image.prefetch(slice, { cachePolicy: 'memory-disk' }).catch(() => {});
}
