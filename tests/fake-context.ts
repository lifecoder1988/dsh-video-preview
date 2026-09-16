/** A minimal stand-in for the client context, recording everything the plugin registers. */
import type { ClientContext, Disposer, DocumentPreviewDefinition } from '../src/client/contract.ts'
import { en } from '../src/client/locales.ts'

/** Registrations and effects one `apply` call produced. */
export interface FakeClientHost {
  readonly ctx: ClientContext
  readonly definitions: Map<string, DocumentPreviewDefinition>
  readonly bodies: Map<string, unknown>
  readonly dictionaries: Map<string, unknown>
  readonly effects: Disposer[]
  /** Run every effect disposer, mirroring a plugin stop or update. */
  disposeAll(): void
}

/**
 * Build a recording context whose services behave like the real ones for the
 * calls this plugin makes: registrations return their own disposer, slots
 * inject immediately, and effects remember what they own.
 * @returns the context and the maps it recorded into.
 */
export function fakeClientHost(): FakeClientHost {
  const definitions = new Map<string, DocumentPreviewDefinition>()
  const bodies = new Map<string, unknown>()
  const dictionaries = new Map<string, unknown>()
  const effects: Disposer[] = []
  const ctx: ClientContext = {
    documentPreviews: {
      register: (definition) => {
        definitions.set(definition.id, definition)
        return () => { definitions.delete(definition.id) }
      },
    },
    slots: {
      inject: (_slot, callback) => callback(),
      register: (options, component) => {
        const cell = options.key ?? options.name
        bodies.set(cell, component)
        return () => { bodies.delete(cell) }
      },
    },
    locale: {
      bind: () => (key: string) => (en as Record<string, string>)[key] ?? key,
      register: (namespace, value) => {
        dictionaries.set(namespace, value)
        return () => { dictionaries.delete(namespace) }
      },
    },
    effect: (callback) => {
      const disposer = callback()
      effects.push(disposer)
      return disposer
    },
  }
  return {
    ctx,
    definitions,
    bodies,
    dictionaries,
    effects,
    disposeAll: () => {
      for (const disposer of effects.splice(0)) disposer()
    },
  }
}
