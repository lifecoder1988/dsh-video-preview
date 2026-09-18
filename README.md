# dsh-video-preview

Video previews for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) right-Sidebar document viewer. Open a video file from the **Files** tab — or from a `present` deliverable card — and it plays in place instead of reporting that the file type cannot be previewed.

[English](README.md) | [中文](README.zh.md)

## What it does

The harness previews Markdown, code, images, PDF, HTML, and plain text. Video containers are deliberately left in the preview owner's unviewable list, so a `.mp4` shows only "Preview is not available for this file type yet". This plugin registers a `video` renderer through the harness's public document-preview extension points:

- **Claimed suffixes** — `mp4`, `m4v`, `mov`, `webm`, `ogv`.
- **Content mode** — `url`: the plugin reads nothing. The renderer resolves the file's absolute path from the standard resource metadata and points the player at the Host's `/api/file` route, which answers ranged requests. A produced file therefore never enters the Remote payload and is bounded by neither the Host's whole-file byte cap nor browser memory; playback starts before the transfer ends and seeking needs no full download.
- **Player** — the browser's own `<video controls>`, fitted inside the pane: a portrait clip is bounded by the pane's height, a wide one by its width, and neither is ever enlarged past its intrinsic size, so the preview body never gains a scrollbar. Seeking, volume, fullscreen, and picture-in-picture are the browser's; the plugin adds no player chrome.
- **Codecs** — decoding belongs to the browser. A container or codec it cannot decode replaces the player with one failure line.
- **No plain-text fallback** — every claimed suffix is declared binary, so the viewer menu stays hidden and the file never opens as text.

## Requirements

- A DeepSeek Harness deployment whose composition includes `@deepseek-ai/dsh-client-ui-sidebar-documentpreview` (the shipped `dsh-web-app` bundle does) **and** whose document preview supports the `url` load mode, where `/api/file` also honors `Range`.
- A browser that decodes the file. H.264/AAC MP4 plays in Chrome, Edge, and Safari; VP8/VP9 WebM plays in every Chromium build, including the codec-restricted one Playwright ships.

On a harness that predates the `url` mode, the renderer still draws and still addresses the route, but the preview owner reads the whole file first under its own byte cap, so only files within that cap play. Version 0.1.0 of this plugin required complete bytes outright; 0.2.0 and later stream.

## Install

Install it straight from Git into the profile that runs your web UI.

1. Install the package into the deployment's web profile:

   ```sh
   cd ~/.dsh/profiles/web
   pnpm add github:lifecoder1988/dsh-video-preview
   ```

   The repository commits its built `lib/`, so the install needs no build step. Adjust the profile path if your deployment uses a different one (any profile with `dsh.profile.bundles` including `@deepseek-ai/dsh-web-app` works).

2. Add the loader row to that profile's `cordis.patch.yml`:

   ```yaml
   - insert:
       - id: video-preview
         name: 'dsh-video-preview'
   ```

   The row's Node half is inert; it exists so the client half is composed into the browser graph.

3. Reload. A profile with `patchReload: live` applies the new patch to a running host; otherwise restart `dsh web` and reload the page once.

## Verify

Open the right Sidebar, choose the **Files** tab, and click any video file. The tab shows the player with native controls. If the browser cannot decode the file, the panel shows one failure line instead.

## How it works

The plugin uses the two extension points the document-preview package publishes, and nothing else:

| Step | API |
| --- | --- |
| Wait for the preview owner | `inject = ['documentPreviews', 'slots', 'locale']` |
| Claim the suffixes | `ctx.documentPreviews.register({ id, extensions, binaryExtensions, priority: 'extension', title, loading: 'url', wrap: false })` |
| Render the body | `ctx.slots.register({ name: 'sidebar.right.tab.document', key: id, locale: 'sidebarVideo' }, VideoBody)` |
| Own the side effects | `ctx.effect(...)` around each registration |

A `url` renderer receives no content: it resolves `useResource(resourceAddress).value.absolutePath` and builds `/api/file?path=…` on the serving origin, which the browser then streams by range. The plugin carries no runtime import of any harness package: the browser bundle keeps `react` and `react/jsx-runtime` as requests the shell's shared module table answers, which pairs with `dsh.client.inject` naming the document-preview package so its bundle is loaded first.

If the in-tree video renderer from a patched harness is also present, it registers under a different id at the `builtin` band, so this plugin wins the toolbar and both appear as candidates only when the built-in is installed too. Removing one of the two removes the duplicate entry.

## Limitations

- **Not every container.** `avi`, `mkv`, `flv`, and `wmv` are not claimed, because Chromium, Firefox, and Safari do not decode them unaided. Add suffixes in `src/client/suffix.ts` only when the file's codec is one browsers actually support.
- **No playback memory, no wrap, no reload.** A streaming tab keeps no view state: reloading or remounting the document returns to the start, and the toolbar offers neither a wrap toggle nor a reload control.
- **No subtitles, chapters, or playback speed UI** beyond what the native player offers.

## Development

```sh
pnpm install
pnpm run build      # lib/index.js (Node half) + lib/client.js (browser bundle)
pnpm run typecheck
pnpm test
```

`tests/artifact.test.ts` loads the built `lib/client.js` exactly as the shell does — registering it through a simulated `window.__ModuleLoader__` and materializing it with a module-table `require` — so a break in the bundle contract fails the suite rather than a deployment.

## License

MIT. The renderer follows the document-renderer conventions of the DeepSeek Harness package `@deepseek-ai/dsh-client-ui-sidebar-documentpreview` (MIT), which owns the extension points this plugin registers into.
