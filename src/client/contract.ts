/**
 * The DeepSeek Harness client contracts this plugin codes against, declared
 * structurally so the package carries no runtime or build-time dependency on
 * the harness workspace.
 *
 * These mirror the published extension points the harness documents for a
 * document renderer: metadata registers with `ctx.documentPreviews` and the
 * component registers into the keyed `sidebar.right.tab.document` Slot. A
 * shape that drifts from the harness is caught at load time by the Slot
 * registry, not silently accepted here.
 */

/** Removes one contribution; every registration returns one. */
export type Disposer = () => void

/** One renderer implementation, registered with `ctx.documentPreviews`. */
export interface DocumentPreviewDefinition {
  /** Unique implementation name, also the key its component registers under. */
  readonly id: string
  /** File suffixes without a leading dot. */
  readonly extensions: readonly string[]
  /**
   * Suffixes among `extensions` whose bytes are not readable text, so a file
   * matching one loses the plain-text fallback among its viewer choices.
   */
  readonly binaryExtensions?: readonly string[]
  /** External implementations outrank product ones; defaults to `extension`. */
  readonly priority?: 'builtin' | 'extension'
  /** Localized implementation label, evaluated when the toolbar renders. */
  readonly title: () => string
  /**
   * How the owner delivers content to this renderer. `url` reads nothing: the
   * owner renders the body at once with `{ kind: 'url' }` and the renderer
   * streams the file through the Host's ranged `/api/file` route, so its size
   * is bounded by neither `maxFileBytes` nor browser memory.
   */
  readonly loading: 'text-pages' | 'bytes-complete' | 'url'
  /** Whether this renderer consumes the document's wrap preference. */
  readonly wrap?: boolean
}

/** The observable registry of document renderers the preview owner publishes. */
export interface DocumentPreviewRegistry {
  /**
   * Register one implementation.
   * @param definition - unique id, recognized suffixes, and load mode.
   * @returns the disposer removing it.
   */
  register(definition: DocumentPreviewDefinition): Disposer
}

/** Locale registration and namespace binding. */
export interface LocaleService {
  /**
   * Bind one namespace for translation.
   * @param namespace - registered namespace name.
   * @returns the translate function for that namespace.
   */
  bind(namespace: string): (key: string, params?: Record<string, unknown>) => string
  /**
   * Register dictionaries for one namespace.
   * @param namespace - namespace name.
   * @param dictionaries - one dictionary per language id.
   * @returns the disposer removing them.
   */
  register(namespace: string, dictionaries: Record<string, Record<string, string>>): Disposer
}

/** Options for one keyed Slot registration. */
export interface SlotRegistration {
  /** Slot name, mirrored by the composition path. */
  readonly name: string
  /** Cell key inside a keyed Slot. */
  readonly key?: string
  /** Locale namespace the component's props translate through. */
  readonly locale?: string
}

/** The Slot registry face the preview owner declares its child seat in. */
export interface SlotsService {
  /**
   * Wait for a Slot to be declared, then register into it.
   * @param slot - exact Slot key.
   * @param callback - registration body, run once the Slot exists.
   * @returns the disposer removing the injection.
   */
  inject(slot: string, callback: () => Disposer): Disposer
  /**
   * Register one entry with its component.
   * @param options - slot name, cell key, and locale namespace.
   * @param component - the component the owner renders for that cell.
   * @returns the disposer removing it.
   */
  register(options: SlotRegistration, component: unknown): Disposer
}

/** The client context services and lifecycle helpers this plugin uses. */
export interface ClientContext {
  readonly documentPreviews: DocumentPreviewRegistry
  readonly slots: SlotsService
  readonly locale: LocaleService
  /**
   * Own one side effect with the calling fiber.
   * @param callback - performs the registration and returns its disposer.
   * @param label - diagnostic label for the effect.
   * @returns the disposer removing the effect.
   */
  effect(callback: () => Disposer, label?: string): Disposer
}
