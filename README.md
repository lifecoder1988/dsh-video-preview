# dsh-video-preview

Video previews for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) right-Sidebar document viewer. Open a video file from the **Files** tab — or from a `present` deliverable card — and it plays in place instead of reporting that the file type cannot be previewed.

[English](README.md) | [中文](README.zh.md)

## What it does

The harness previews Markdown, code, images, PDF, HTML, and plain text. Video containers are deliberately left in the preview owner's unviewable list, so a `.mp4` shows only "Preview is not available for this file type yet". This plugin registers a `video` renderer through the harness's public document-preview extension points:

- **Claimed suffixes** — `mp4`, `m4v`, `mov`, `webm`, `ogv`.
- **Content mode** — `bytes-complete`: the file arrives as complete bytes, exactly like the built-in image, PDF, and HTML renderers, then becomes a Blob URL.
- **Player** — the browser's own `<video controls>`, sized to the pane width. Seeking, volume, fullscreen, and picture-in-picture are the browser's; the plugin adds no player chrome.
- **Codecs** — decoding belongs to the browser. A container or codec it cannot decode replaces the player with one failure line rather than failing the read, because the bytes were already complete.
- **No plain-text fallback** — every claimed suffix is declared binary, so the viewer menu stays hidden and the file never opens as text.

## Requirements

- A DeepSeek Harness deployment whose composition includes `@deepseek-ai/dsh-client-ui-sidebar-documentpreview` (the shipped `dsh-web-app` bundle does).
- A browser that decodes the file. H.264/AAC MP4 plays in Chrome, Edge, and Safari; VP8/VP9 WebM plays in every Chromium build, including the codec-restricted one Playwright ships.

## Install

The plugin is unpublished; install it straight from Git into the profile that runs your web UI.

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
| Claim the suffixes | `ctx.documentPreviews.register({ id, extensions, binaryExtensions, priority: 'extension', title, loading: 'bytes-complete', wrap: false })` |
| Render the body | `ctx.slots.register({ name: 'sidebar.right.tab.document', key: id, locale: 'sidebarVideo' }, VideoBody)` |
| Own the side effects | `ctx.effect(...)` around each registration |

The plugin carries no runtime import of any harness package: the browser bundle keeps `react` and `react/jsx-runtime` as requests the shell's shared module table answers, which pairs with `dsh.client.inject` naming the document-preview package so its bundle is loaded first.

If the in-tree video renderer from a patched harness is also present, it registers under a different id at the `builtin` band, so this plugin wins the toolbar and both appear as candidates only when the built-in is installed too. Removing one of the two removes the duplicate entry.

## Limitations

- **Whole-file reads.** The renderer uses the owner's `bytes-complete` mode, so a video must fit the Host's `maxFileBytes` cap (32 MiB by default). Range requests are not used; seeking works because the whole file is already in the Blob.
- **No playback position memory.** Reloading or remounting the document returns to the start, unlike text scroll.
- **Not every container.** `avi`, `mkv`, `flv`, and `wmv` are not claimed, because Chromium, Firefox, and Safari do not decode them unaided. Add suffixes in `src/client/index.ts` only when the file's codec is one browsers actually support.
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
