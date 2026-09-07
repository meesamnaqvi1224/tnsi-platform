/**
 * Mirrors the detection half of apps/web/src/lib/practices.ts's
 * `toGoogleDriveEmbedUrl`: a Google Drive "share" link (.../file/d/<id>/view
 * etc.) points at an HTML viewer page, not a raw media stream - neither
 * `expo-video` nor `expo-audio` can play it directly (they need a direct
 * file/HLS URL). The web app works around this with an <iframe> pointed at
 * Drive's /preview endpoint; there is no native-app equivalent that counts
 * as genuine native playback, so the mobile player instead offers an
 * external-browser fallback for these - see PracticeMedia's handling.
 */
const GOOGLE_DRIVE_PATTERN = /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?)/;

export function isGoogleDriveUrl(url: string): boolean {
  return GOOGLE_DRIVE_PATTERN.test(url);
}

const AUDIO_EXTENSION_PATTERN = /\.(mp3|m4a|aac|wav|ogg|flac)(\?|$)/i;

export type MediaKind = 'audio' | 'video' | 'external' | 'none';

/**
 * `contentType` distinguishes `audio`/`video` explicitly, but
 * `meditation`/`breathwork`/`movement`/`journal` don't say which media
 * format (if any) their `mediaUrl` actually is - the schema has no
 * separate field for that. Falling back to the file extension of the real
 * URL is a read of actual data, not an invented taxonomy; video is the
 * final fallback since expo-video can also play an audio-only file.
 */
export function resolveMediaKind(mediaUrl: string | null, contentType: string): MediaKind {
  if (!mediaUrl) return 'none';
  if (isGoogleDriveUrl(mediaUrl)) return 'external';
  if (contentType === 'audio') return 'audio';
  if (contentType === 'video') return 'video';
  return AUDIO_EXTENSION_PATTERN.test(mediaUrl) ? 'audio' : 'video';
}
