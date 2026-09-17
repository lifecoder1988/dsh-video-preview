/** The renderer registration: metadata, keyed body, dictionary, suffix claim, and disposal. */
import { describe, expect, it, vi } from 'vitest'
import { VideoBody } from '../src/client/VideoBody.tsx'
import {
  apply,
  inject,
  VIDEO_BODY_ID,
  VIDEO_LOCALE_NAMESPACE,
  videoBodyDefinition,
} from '../src/client/index.ts'
import { en, zh } from '../src/client/locales.ts'
import { isPlayableVideo, VIDEO_EXTENSIONS } from '../src/client/suffix.ts'
import { fakeClientHost } from './fake-context.ts'

describe('videoBodyDefinition', () => {
  it('claims playable container suffixes as an extension streaming renderer without wrap', () => {
    const title = vi.fn(() => 'localized video')
    const definition = videoBodyDefinition(title)
    expect(definition).toEqual({
      id: VIDEO_BODY_ID,
      extensions: VIDEO_EXTENSIONS,
      binaryExtensions: VIDEO_EXTENSIONS,
      priority: 'extension',
      title,
      loading: 'url',
      wrap: false,
    })
    expect(title).not.toHaveBeenCalled()
    expect(definition.title()).toBe('localized video')
  })

  it('matches only the claimed suffixes, in any case and on either separator', () => {
    for (const extension of VIDEO_EXTENSIONS) {
      expect(isPlayableVideo(`folder/CLIP.${extension.toUpperCase()}`)).toBe(true)
    }
    expect(isPlayableVideo('folder\\nested\\clip.webm')).toBe(true)
    expect(isPlayableVideo('folder/clip.mkv')).toBe(false)
    expect(isPlayableVideo('folder/clip')).toBe(false)
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
