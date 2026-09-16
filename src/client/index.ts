/**
 * Browser half of the plugin: register the video renderer with the right
 * Sidebar's document preview.
 *
 * Two public extension points carry the whole feature: metadata goes to
 * `ctx.documentPreviews`, whose registry the preview owner publishes, and the
 * component goes to the keyed `sidebar.right.tab.document` child slot, whose
 * cell key is the implementation id. The `inject` declaration keeps this
 * plugin waiting until those services exist, so it never registers into a
 * registry that is not there yet.
 */
import { VideoBody } from './VideoBody.tsx'
import { en, zh } from './locales.ts'
import type { ClientContext, DocumentPreviewDefinition } from './contract.ts'

/** Services this plugin cannot run without. */
export const inject = ['documentPreviews', 'slots', 'locale']

/** This implementation's identity, shared by its metadata and its slot cell. */
export const VIDEO_BODY_ID = 'dsh-video-preview/video'

/** Container suffixes the browser's own decoder plays from a Blob URL. */
export const VIDEO_EXTENSIONS = ['mp4', 'm4v', 'mov', 'webm', 'ogv'] as const

/** Locale namespace carrying this renderer's labels. */
export const VIDEO_LOCALE_NAMESPACE = 'sidebarVideo'

/**
 * Describe the video renderer independently of its keyed body slot.
 * Every suffix is binary: a player decodes container bytes, never text.
 * @param title - locale-owned implementation name.
 * @returns metadata for complete video files.
 */
export function videoBodyDefinition(title: () => string): DocumentPreviewDefinition {
  return {
    id: VIDEO_BODY_ID,
    extensions: VIDEO_EXTENSIONS,
    binaryExtensions: VIDEO_EXTENSIONS,
    priority: 'extension',
    title,
    loading: 'bytes-complete',
    wrap: false,
  }
}

/**
 * Register the dictionary, the metadata, and the body, each owned by an effect
 * so stopping or updating the plugin removes exactly what it added.
 * @param ctx - the client context carrying the three injected services.
 */
export function apply(ctx: ClientContext): void {
  const t = ctx.locale.bind(VIDEO_LOCALE_NAMESPACE)
  ctx.effect(
    () => ctx.locale.register(VIDEO_LOCALE_NAMESPACE, { zh, en }),
    'dsh-video-preview: dictionaries',
  )
  ctx.effect(
    () => ctx.documentPreviews.register(videoBodyDefinition(() => t('title'))),
    'dsh-video-preview: metadata',
  )
  ctx.effect(
    () => ctx.slots.inject('sidebar.right.tab.document', () => ctx.slots.register(
      { name: 'sidebar.right.tab.document', key: VIDEO_BODY_ID, locale: VIDEO_LOCALE_NAMESPACE },
      VideoBody,
    )),
    'dsh-video-preview: body',
  )
}
