/** The renderer registration: metadata, keyed body, dictionary, and disposal. */
import { describe, expect, it, vi } from 'vitest'
import { VideoBody } from '../src/client/VideoBody.tsx'
import {
  apply,
  inject,
  VIDEO_BODY_ID,
  VIDEO_EXTENSIONS,
  VIDEO_LOCALE_NAMESPACE,
  videoBodyDefinition,
} from '../src/client/index.ts'
import { en, zh } from '../src/client/locales.ts'
import { fakeClientHost } from './fake-context.ts'

describe('videoBodyDefinition', () => {
  it('claims playable container suffixes as an extension renderer of complete bytes without wrap', () => {
    const title = vi.fn(() => 'localized video')
    const definition = videoBodyDefinition(title)
    expect(definition).toEqual({
      id: VIDEO_BODY_ID,
      extensions: VIDEO_EXTENSIONS,
      binaryExtensions: VIDEO_EXTENSIONS,
      priority: 'extension',
      title,
      loading: 'bytes-complete',
      wrap: false,
    })
    expect(title).not.toHaveBeenCalled()
    expect(definition.title()).toBe('localized video')
  })
})

describe('apply', () => {
  it('declares the three services the registration needs', () => {
    expect(inject).toEqual(['documentPreviews', 'slots', 'locale'])
  })

  it('registers the dictionary, the metadata, and the keyed body', () => {
    const host = fakeClientHost()
    apply(host.ctx)
    expect(host.dictionaries.get(VIDEO_LOCALE_NAMESPACE)).toEqual({ zh, en })
    expect(host.definitions.get(VIDEO_BODY_ID)?.title()).toBe(en.title)
    expect(host.bodies.get(VIDEO_BODY_ID)).toBe(VideoBody)
    expect(host.effects).toHaveLength(3)
  })

  it('removes every contribution when its effects are disposed', () => {
    const host = fakeClientHost()
    apply(host.ctx)
    host.disposeAll()
    expect(host.dictionaries.size).toBe(0)
    expect(host.definitions.size).toBe(0)
    expect(host.bodies.size).toBe(0)
  })
})
