/** Container suffixes the browser's own decoder plays straight from a file route. */

/** Suffixes this renderer claims; every one is a binary container, never text. */
export const VIDEO_EXTENSIONS = ['mp4', 'm4v', 'mov', 'webm', 'ogv'] as const

/**
 * Whether a decoded path carries a suffix this renderer plays.
 * @param path - decoded workspace file path, POSIX or Windows shaped.
 * @returns true when the file's suffix is one of {@link VIDEO_EXTENSIONS}.
 */
export function isPlayableVideo(path: string): boolean {
  const normalized = path.replaceAll('\\', '/')
  const name = normalized.slice(normalized.lastIndexOf('/') + 1).toLowerCase()
  const extension = name.slice(name.lastIndexOf('.') + 1)
  return (VIDEO_EXTENSIONS as readonly string[]).includes(extension)
}
