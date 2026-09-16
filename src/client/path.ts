/**
 * Address and filename helpers. The preview addresses one file as
 * `dsh-resource://file/session/<sessionId>/<path>`, whose path segments are
 * percent-encoded; this renderer only needs the decoded path's final segment
 * and its suffix, so it decodes tolerantly and never throws into render.
 */

/** Session file address prefix the preview owner builds addresses with. */
export const SESSION_FILE_PREFIX = 'dsh-resource://file/session/'

/**
 * Decode the workspace path from a session file address.
 * @param address - a `dsh-resource://file/session/…` address, or any string.
 * @returns the decoded path, the address itself when it is not a session file
 * address, or the undecoded remainder when a segment is malformed.
 */
export function filePathOf(address: string): string {
  if (!address.startsWith(SESSION_FILE_PREFIX)) return address
  const remainder = address.slice(SESSION_FILE_PREFIX.length)
  const separator = remainder.indexOf('/')
  if (separator === -1) return address
  const encoded = remainder.slice(separator + 1)
  if (encoded === '') return address
  try {
    return encoded.split('/').map(segment => decodeURIComponent(segment)).join('/')
  } catch {
    return encoded
  }
}

/**
 * The final path segment of a decoded path.
 * @param path - decoded workspace path, POSIX or Windows shaped.
 * @returns the file name, or the path itself when it carries no separator.
 */
export function fileNameOf(path: string): string {
  const normalized = path.replaceAll('\\', '/')
  return normalized.slice(normalized.lastIndexOf('/') + 1)
}
