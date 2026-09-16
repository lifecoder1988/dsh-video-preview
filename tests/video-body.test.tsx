/** Blob ownership, media types, native player rendering, and failure states. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { VideoBody, videoMediaType, type VideoBodyProps } from '../src/client/VideoBody.tsx'
import { en, type VideoPreviewKey } from '../src/client/locales.ts'

const translations: ReadonlyMap<string, string> = new Map(Object.entries(en))
let createDescriptor: PropertyDescriptor | undefined
let revokeDescriptor: PropertyDescriptor | undefined
const create = vi.fn<(blob: Blob) => string>()
const revoke = vi.fn<(url: string) => void>()

beforeEach(() => {
  createDescriptor = Object.getOwnPropertyDescriptor(URL, 'createObjectURL')
  revokeDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL')
  create.mockReset().mockImplementation(() => `blob:https://example.invalid/${create.mock.calls.length}`)
  revoke.mockReset()
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: create })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke })
})

afterEach(() => {
  try { cleanup() } finally {
    if (createDescriptor === undefined) Reflect.deleteProperty(URL, 'createObjectURL')
    else Object.defineProperty(URL, 'createObjectURL', createDescriptor)
    if (revokeDescriptor === undefined) Reflect.deleteProperty(URL, 'revokeObjectURL')
    else Object.defineProperty(URL, 'revokeObjectURL', revokeDescriptor)
  }
})

function props(path = 'clip.mp4', data: Uint8Array<ArrayBuffer> = new Uint8Array([1, 2, 3])): VideoBodyProps {
  return {
    resourceAddress: `dsh-resource://file/session/s-1/${path}`,
    content: { kind: 'bytes', data },
    t: (key: VideoPreviewKey, params?: Record<string, unknown>) => {
      const value = translations.get(key) ?? key
      return params === undefined ? value : value.replace('{name}', String(params.name))
    },
  }
}

describe('VideoBody', () => {
  it.each([
    ['mp4', 'video/mp4'],
    ['m4v', 'video/mp4'],
    ['mov', 'video/quicktime'],
    ['webm', 'video/webm'],
    ['ogv', 'video/ogg'],
  ] as const)('assigns .%s bytes the %s Blob media type', async (extension, mediaType) => {
    const view = render(<VideoBody {...props(`clip.${extension}`)} />)
    const player = await view.findByLabelText(`Video preview: clip.${extension}`)
    expect(create.mock.calls[0]?.[0].type).toBe(mediaType)
    expect(player.getAttribute('src')).toBe('blob:https://example.invalid/1')
    view.unmount()
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:https://example.invalid/1')
  })

  it('plays through the browser native controls at the pane width', async () => {
    const view = render(<VideoBody {...props()} />)
    const player = await view.findByLabelText('Video preview: clip.mp4')
    expect(player.tagName).toBe('VIDEO')
    expect(player.hasAttribute('controls')).toBe(true)
    expect(player.getAttribute('preload')).toBe('metadata')
    expect(player.getAttribute('playsinline')).not.toBeNull()
    expect(view.container.querySelector('[data-video-preview]')).not.toBeNull()
  })

  it('revokes replaced bytes, re-arms playback, and reports decode and Blob creation failures', async () => {
    const view = render(<VideoBody {...props()} />)
    const first = await view.findByLabelText('Video preview: clip.mp4')
    fireEvent.error(first)
    expect(screen.getByRole('alert').textContent).toBe(en.failed)
    view.rerender(<VideoBody {...props('clip.mp4', new Uint8Array([4, 5, 6]))} />)
    // The replacement's own bytes clear the previous decode failure.
    await view.findByLabelText('Video preview: clip.mp4')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(revoke).toHaveBeenCalledWith('blob:https://example.invalid/1')
    create.mockImplementationOnce(() => { throw new Error('Blob unavailable') })
    view.rerender(<VideoBody {...props('other.mp4', new Uint8Array([7]))} />)
    expect((await screen.findByRole('alert')).textContent).toBe(en.failed)
    view.unmount()
    // The replaced run revoked its own Blob; the failed creation had nothing to revoke.
    expect(revoke.mock.calls.map(call => call[0])).toEqual([
      'blob:https://example.invalid/1',
      'blob:https://example.invalid/2',
    ])
  })

  it('rejects text delivery and an unregistered suffix without creating a Blob', () => {
    const initial = props()
    const view = render(<VideoBody {...initial} content={{ kind: 'text' }} />)
    expect(screen.getByRole('alert').textContent).toBe(en.unsupported)
    view.rerender(<VideoBody {...props('clip.mkv')} />)
    expect(screen.getByRole('alert').textContent).toBe(en.unsupported)
    expect(create).not.toHaveBeenCalled()
  })

  it('matches media types case-insensitively on decoded path suffixes', () => {
    expect(videoMediaType('folder/CLIP.MP4')).toBe('video/mp4')
    expect(videoMediaType('folder\\CLIP.WEBM')).toBe('video/webm')
    expect(videoMediaType('folder/no-extension')).toBeUndefined()
    expect(videoMediaType('folder/clip.mkv')).toBeUndefined()
  })
})
