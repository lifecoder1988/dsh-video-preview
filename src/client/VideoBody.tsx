/**
 * The video renderer body: the file streams from the Host's own file route into
 * the browser's player, sized to the document pane.
 *
 * The renderer reads nothing. It addresses the file and the browser issues ranged
 * requests, so a file of any size plays with bounded memory and seeks without a
 * whole-file transfer. Playback support belongs to the browser's decoder: a
 * container or codec it cannot decode fails the player, and the failure line
 * replaces it.
 */
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { fileNameOf, filePathOf } from './path.ts'
import { isPlayableVideo } from './suffix.ts'
import type { VideoTranslate } from './locales.ts'

/** Live observation of one `file` resource address, as the slot provides it. */
export type UseFileResource = (address: string) => {
  readonly status: 'none' | 'loading' | 'live' | 'failed'
  readonly value: { readonly absolutePath: string } | undefined
  readonly failure: unknown
}

/** The preview owner's props this renderer reads; every other prop is ignored. */
export interface VideoBodyProps {
  /** Original file address, carrying the session and workspace path. */
  readonly resourceAddress: string
  /** Standard resource hook, carrying the absolute path the file route needs. */
  readonly useResource: UseFileResource
  /** Namespace-bound translate for status lines and accessible names. */
  readonly t: VideoTranslate
}

/** The frame follows the scroller's width, so the player shrinks to the pane. */
const FRAME: CSSProperties = {
  display: 'flex',
  boxSizing: 'border-box',
  width: '100%',
  minHeight: '100%',
  padding: 12,
  fontFamily: 'var(--dsw-font, sans-serif)',
  whiteSpace: 'normal',
}

/** The player fills the frame's content box at its intrinsic aspect ratio. */
const PLAYER: CSSProperties = {
  display: 'block',
  width: '100%',
  maxWidth: '100%',
  height: 'auto',
  margin: 'auto',
  borderRadius: 8,
  background: '#000',
}

/** One status line replaces the player for loading, refusal, and failure. */
const STATUS: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  width: '100%',
  minHeight: '100%',
  margin: 0,
  padding: 10,
  color: 'var(--dsw-alias-label-secondary)',
  fontSize: 13,
  lineHeight: 1.5,
  whiteSpace: 'normal',
}

/**
 * Same-origin URL serving one Host file, which the browser streams by range.
 *
 * The preview is always served by the Host over HTTP(S); a document opened under
 * any other protocol (a `file:` page) cannot address the route, so the relative
 * path is returned there and the player reports its own failure.
 * @param absolutePath - the file's absolute path in the execution world.
 * @param location - page location supplying the origin, injected for tests.
 * @returns the file-route URL for that path.
 */
export function fileRouteUrl(
  absolutePath: string,
  location: Pick<Location, 'protocol' | 'origin'>,
): string {
  const path = `/api/file?path=${encodeURIComponent(absolutePath)}`
  return location.protocol === 'http:' || location.protocol === 'https:' ? `${location.origin}${path}` : path
}

/**
 * Stream a video file from the Host's route through the browser's player.
 * @param props - the file address, the standard resource hook, and copy.
 * @returns the player inside a full-width frame, or the state that replaces it.
 */
export function VideoBody({ resourceAddress, useResource, t }: VideoBodyProps): ReactNode {
  const path = useMemo(() => filePathOf(resourceAddress), [resourceAddress])
  const absolutePath = useResource(resourceAddress).value?.absolutePath
  // The failure belongs to the file that failed, so addressing another file
  // restarts playback instead of inheriting this one's failure line.
  const [failedPath, setFailedPath] = useState<string>()

  if (!isPlayableVideo(path)) return <p style={STATUS} role="alert">{t('unsupported')}</p>
  // The route needs the execution world's absolute path, which arrives with the
  // file resource's first observation frame.
  if (absolutePath === undefined) return <p style={STATUS} role="status" aria-label={t('loading')} data-video-loading />
  if (failedPath === absolutePath) return <p style={STATUS} role="alert">{t('failed')}</p>
  return <div style={FRAME} data-video-preview>
    <video
      // A different file gets a fresh element rather than the failed one's state.
      key={absolutePath}
      style={PLAYER}
      src={fileRouteUrl(absolutePath, window.location)}
      controls
      playsInline
      preload="metadata"
      aria-label={t('preview', { name: fileNameOf(path) })}
      data-video-player
      onError={() => { setFailedPath(absolutePath) }}
    />
  </div>
}
