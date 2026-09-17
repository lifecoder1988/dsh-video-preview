// @vitest-environment jsdom
/** Route addressing, native player rendering, metadata waiting, and failure states. */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { fileRouteUrl, VideoBody, type VideoBodyProps } from '../src/client/VideoBody.tsx'
import { en } from '../src/client/locales.ts'

const translations: ReadonlyMap<string, string> = new Map(Object.entries(en))

afterEach(() => { cleanup() })

/** `null` means the resource has not yielded its first observation frame yet. */
function props(path = 'clip.mp4', absolutePath: string | null = '/workspace/clip.mp4'): VideoBodyProps {
  return {
    resourceAddress: `dsh-resource://file/session/video/${path}`,
    useResource: () => ({
      status: absolutePath === null ? 'loading' : 'live',
      value: absolutePath === null ? undefined : { absolutePath },
      failure: undefined,
    }),
    t: (key, params) => {
      const value = translations.get(key) ?? key
      return params === undefined ? value : value.replace('{name}', String(params.name))
    },
  }
}

describe('fileRouteUrl', () => {
  it('addresses the Host file route on the serving origin', () => {
    expect(fileRouteUrl('/work/clip.mp4', { protocol: 'http:', origin: 'http://127.0.0.1:3080' }))
      .toBe('http://127.0.0.1:3080/api/file?path=%2Fwork%2Fclip.mp4')
  })

  it('encodes spaces and non-ASCII path segments', () => {
    expect(fileRouteUrl('/work/制作/第 01 章.mp4', { protocol: 'https:', origin: 'https://host' }))
      .toBe('https://host/api/file?path=%2Fwork%2F%E5%88%B6%E4%BD%9C%2F%E7%AC%AC%2001%20%E7%AB%A0.mp4')
  })

  it('falls back to a relative route when the page is not served over HTTP', () => {
    expect(fileRouteUrl('/work/clip.mp4', { protocol: 'file:', origin: 'null' }))
      .toBe('/api/file?path=%2Fwork%2Fclip.mp4')
  })
})

describe('VideoBody', () => {
  it('streams the file through the Host route on the browser native player', () => {
    const view = render(<VideoBody {...props()} />)
    const player = view.getByLabelText('Video preview: clip.mp4')
    expect(player.tagName).toBe('VIDEO')
    expect(player.getAttribute('src')).toBe('http://localhost:3000/api/file?path=%2Fworkspace%2Fclip.mp4')
    expect(player.hasAttribute('controls')).toBe(true)
    expect(player.getAttribute('preload')).toBe('metadata')
    expect(player.getAttribute('playsinline')).not.toBeNull()
    expect(view.container.querySelector('[data-video-preview]')).not.toBeNull()
  })

  it('waits for the resource metadata that carries the absolute path', () => {
    const view = render(<VideoBody {...props('clip.mp4', null)} />)
    expect(view.container.querySelector('[data-video-loading]')?.getAttribute('aria-label')).toBe(en.loading)
    expect(view.container.querySelector('[data-video-player]')).toBeNull()
    view.rerender(<VideoBody {...props()} />)
    expect(view.getByLabelText('Video preview: clip.mp4')).toBeDefined()
  })

  it('replaces the player with one failure line when the browser cannot play the file', () => {
    const view = render(<VideoBody {...props()} />)
    fireEvent.error(view.getByLabelText('Video preview: clip.mp4'))
    expect(screen.getByRole('alert').textContent).toBe(en.failed)
  })

  it('restarts playback from a clean state when the addressed file changes', () => {
    const view = render(<VideoBody {...props()} />)
    fireEvent.error(view.getByLabelText('Video preview: clip.mp4'))
    expect(screen.queryByRole('alert')).not.toBeNull()
    view.rerender(<VideoBody {...props('other.mp4', '/workspace/other.mp4')} />)
    const player = view.getByLabelText('Video preview: other.mp4')
    expect(player.getAttribute('src')).toBe('http://localhost:3000/api/file?path=%2Fworkspace%2Fother.mp4')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('refuses a suffix this renderer does not claim', () => {
    render(<VideoBody {...props('clip.mkv')} />)
    expect(screen.getByRole('alert').textContent).toBe(en.unsupported)
  })
})
