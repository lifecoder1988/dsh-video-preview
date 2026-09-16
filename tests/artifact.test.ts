// @vitest-environment node
/**
 * The built browser artifact, loaded exactly as the harness loads it: the
 * script registers a closure factory through `window.__ModuleLoader__.load`,
 * and the factory materializes the plugin with a `require` answered from the
 * shared module table.
 *
 * These assertions are the contract the shell enforces at boot, so a build
 * regression fails here instead of in a deployment.
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import * as React from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import { beforeAll, describe, expect, it } from 'vitest'
import { VIDEO_BODY_ID } from '../src/client/index.ts'
import { fakeClientHost } from './fake-context.ts'

const BUNDLE = fileURLToPath(new URL('../lib/client.js', import.meta.url))

interface LoadCall {
  readonly id: string
  readonly factory: (require: (specifier: string) => unknown) => Record<string, unknown>
}

let source: string
let call: LoadCall

/** The `require` the shell answers from its shared module table. */
function moduleTableRequire(specifier: string): unknown {
  if (specifier === 'react') return React
  if (specifier === 'react/jsx-runtime') return jsxRuntime
  throw new Error(`dsh-video-preview: unexpected module request "${specifier}"`)
}

beforeAll(async () => {
  source = await readFile(BUNDLE, 'utf8')
  const calls: LoadCall[] = []
  const sandboxWindow = { __ModuleLoader__: { load: (value: LoadCall) => { calls.push(value) } } }
  const module = { exports: {} as Record<string, unknown> }
  // eslint-disable-next-line no-new-func -- the artifact is the subject under test.
  new Function('window', 'module', 'exports', 'require', source)(
    sandboxWindow, module, module.exports, moduleTableRequire,
  )
  if (calls.length !== 1) throw new Error(`expected one __ModuleLoader__.load call, saw ${calls.length}`)
  call = calls[0] as LoadCall
})

describe('built client bundle', () => {
  it('registers one closure factory under the package id', () => {
    expect(call.id).toBe('dsh-video-preview')
    expect(typeof call.factory).toBe('function')
  })

  it('keeps the shared module table out of the bundle', () => {
    expect(source).toContain('require("react")')
    expect(source).toContain('require("react/jsx-runtime")')
  })

  it('materializes a plugin whose apply registers the video renderer', () => {
    const exports = call.factory(moduleTableRequire)
    expect(typeof exports.apply).toBe('function')
    expect(exports.inject).toEqual(['documentPreviews', 'slots', 'locale'])
    const host = fakeClientHost()
    ;(exports.apply as (ctx: unknown) => void)(host.ctx)
    expect(host.definitions.get(VIDEO_BODY_ID)?.extensions).toEqual(['mp4', 'm4v', 'mov', 'webm', 'ogv'])
    expect(host.bodies.get(VIDEO_BODY_ID)).toBeTypeOf('function')
  })
})
