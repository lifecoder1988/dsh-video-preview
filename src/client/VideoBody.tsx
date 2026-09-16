/**
 * The video renderer body: complete file bytes played by the browser's own
 * player, sized to the document pane.
 *
 * Playback support belongs to the browser's decoder. A container or codec it
 * cannot decode fails the player rather than the read — the bytes were already
 * complete — and the failure line replaces the player.
 */
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { fileNameOf, filePathOf } from './path.ts'
import type { VideoPreviewKey } from './locales.ts'

/** Container suffixes a browser decodes from a Blob URL, with the media type its Blob carries. */
const VIDEO_MEDIA_TYPES = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  ogv: 'video/ogg',
} as const

/** Media type this renderer assigns to a supported filename's Blob. */
export type VideoMediaType = typeof VIDEO_MEDIA_TYPES[keyof typeof VIDEO_MEDIA_TYPES]

/** Contents prepared by the preview owner; byte arrays are transient UI input. */
export type DocumentContent =
  | { readonly kind: 'text' }
  | { readonly kind: 'bytes'; readonly data: Uint8Array<ArrayBuffer> }

/** Translate function bound to this renderer's namespace. */
export type VideoTranslate = (key: VideoPreviewKey, params?: Record<string, unknown>) => string

/** The preview owner's props this renderer reads. */
export interface VideoBodyProps {
  /** Prepared content: complete bytes, or text the renderer refuses. */
  readonly content: DocumentContent
  /** Original file address, also readable through the owner's resource hook. */
  readonly resourceAddress: string
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

type VideoSource =
  | {
    readonly kind: 'ready'
    readonly data: Uint8Array<ArrayBuffer>
    readonly mediaType: VideoMediaType
    readonly url: string
  }
  | { readonly kind: 'failed'; readonly data: Uint8Array<ArrayBuffer>; readonly mediaType: VideoMediaType }

/**
 * Resolve a supported filename to the media type assigned to its Blob.
 * @param path - decoded workspace file path.
 * @returns the video media type, or undefined for an unregistered suffix.
 */
export function videoMediaType(path: string): VideoMediaType | undefined {
  const name = fileNameOf(path).toLowerCase()
  const extension = name.slice(name.lastIndexOf('.') + 1) as keyof typeof VIDEO_MEDIA_TYPES
  return VIDEO_MEDIA_TYPES[extension]
}

/**
 * Play complete video bytes through the browser's native player.
 * @param props - prepared content, file address, and copy.
 * @returns the player in a full-width frame, or the status that replaces it.
 */
export function VideoBody({ content, resourceAddress, t }: VideoBodyProps): ReactNode {
  const path = useMemo(() => filePathOf(resourceAddress), [resourceAddress])
  const mediaType = videoMediaType(path)
  const data = content.kind === 'bytes' ? content.data : undefined
  const [source, setSource] = useState<VideoSource>()
  const [playback, setPlayback] = useState<'pending' | 'failed'>('pending')

  useEffect(() => {
    if (data === undefined || mediaType === undefined) return
    let url: string | undefined
    setPlayback('pending')
    try {
      url = URL.createObjectURL(new Blob([data], { type: mediaType }))
      setSource({ kind: 'ready', data, mediaType, url })
    } catch {
      setSource({ kind: 'failed', data, mediaType })
    }
    return () => {
      if (url !== undefined) URL.revokeObjectURL(url)
    }
  }, [data, mediaType])

  if (data === undefined || mediaType === undefined) {
    return <p style={STATUS} role="alert">{t('unsupported')}</p>
  }
  if (source?.data !== data || source.mediaType !== mediaType) {
    return <p style={STATUS} role="status">{t('loading')}</p>
  }
  if (source.kind === 'failed' || playback === 'failed') {
    return <p style={STATUS} role="alert">{t('failed')}</p>
  }
  return (
    <div style={FRAME} data-video-preview>
      <video
        style={PLAYER}
        src={source.url}
        controls
        playsInline
        preload="metadata"
        aria-label={t('preview', { name: fileNameOf(path) })}
        data-video-player
        onError={() => { setPlayback('failed') }}
      />
    </div>
  )
}
