/** Addressing helpers: session file addresses and their final path segment. */
import { describe, expect, it } from 'vitest'
import { fileNameOf, filePathOf } from '../src/client/path.ts'

describe('filePathOf', () => {
  it('decodes the workspace path out of a session file address', () => {
    expect(filePathOf('dsh-resource://file/session/s-1/work/clip.mp4')).toBe('work/clip.mp4')
    expect(filePathOf('dsh-resource://file/session/s-1/dir%20with%20space/a%20clip.mp4')).toBe('dir with space/a clip.mp4')
    expect(filePathOf('dsh-resource://file/session/s-1/%E5%88%B6%E4%BD%9C/clip.mp4')).toBe('制作/clip.mp4')
  })

  it('leaves anything that is not a session file address untouched', () => {
    expect(filePathOf('dsh-resource://file/absolute/tmp/clip.mp4')).toBe('dsh-resource://file/absolute/tmp/clip.mp4')
    expect(filePathOf('clip.mp4')).toBe('clip.mp4')
    expect(filePathOf('dsh-resource://file/session/s-1')).toBe('dsh-resource://file/session/s-1')
    expect(filePathOf('dsh-resource://file/session/s-1/')).toBe('dsh-resource://file/session/s-1/')
  })

  it('falls back to the undecoded path when a segment is malformed', () => {
    expect(filePathOf('dsh-resource://file/session/s-1/bad%2/clip.mp4')).toBe('bad%2/clip.mp4')
  })
})

describe('fileNameOf', () => {
  it('reads the final segment of POSIX and Windows shaped paths', () => {
    expect(fileNameOf('work/clip.mp4')).toBe('clip.mp4')
    expect(fileNameOf('work\\nested\\clip.webm')).toBe('clip.webm')
    expect(fileNameOf('clip.mp4')).toBe('clip.mp4')
    expect(fileNameOf('')).toBe('')
  })
})
