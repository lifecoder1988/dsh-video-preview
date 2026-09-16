# dsh-video-preview

为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 右侧栏文档预览提供视频预览。从 **Files** tab 打开视频文件（或从 `present` 交付卡片进入），它就地播放，而不是提示该文件类型无法预览。

[English](README.md) | 中文

## 它做什么

harness 可预览 Markdown、代码、图片、PDF、HTML 和纯文本。视频容器被有意留在预览 owner 的不可预览列表中，因此 `.mp4` 只会显示「暂不支持预览此文件类型」。本插件通过 harness 公开的文档预览扩展点注册一个 `video` 渲染器：

- **认领的后缀** —— `mp4`、`m4v`、`mov`、`webm`、`ogv`。
- **内容模式** —— `bytes-complete`：文件以完整字节送达，与内置的图片、PDF、HTML 渲染器完全一致，随后转成 Blob URL。
- **播放器** —— 浏览器自带的 `<video controls>`，按面板宽度显示。拖动进度、音量、全屏和画中画都由浏览器提供；插件不添加任何播放器界面。
- **编码** —— 解码由浏览器负责。它无法解码的容器或编码只用一行失败提示替换播放器，而不会让读取失败，因为此刻字节已经完整。
- **没有纯文本兜底** —— 每个认领的后缀都声明为二进制，因此查看器菜单保持隐藏，文件也绝不会按文本打开。

## 前提

- 一个组合中包含 `@deepseek-ai/dsh-client-ui-sidebar-documentpreview` 的 DeepSeek Harness 部署（随包发布的 `dsh-web-app` bundle 已包含）。
- 能解码该文件的浏览器。H.264/AAC 的 MP4 在 Chrome、Edge 和 Safari 中可播放；VP8/VP9 的 WebM 在包括 Playwright 所带受限编码版本在内的所有 Chromium 构建中都可播放。

## 安装

插件尚未发布，直接从 Git 装进运行 Web UI 的 profile。

1. 把包装进部署的 web profile：

   ```sh
   cd ~/.dsh/profiles/web
   pnpm add github:lifecoder1988/dsh-video-preview
   ```

   仓库已提交构建产物 `lib/`，因此安装无需构建步骤。若你的部署使用其它 profile，请相应调整路径（任何 `dsh.profile.bundles` 含 `@deepseek-ai/dsh-web-app` 的 profile 均可）。

2. 向该 profile 的 `cordis.patch.yml` 添加 loader 行：

   ```yaml
   - insert:
       - id: video-preview
         name: 'dsh-video-preview'
   ```

   该行的 Node 半边是惰性的；它存在的意义是让客户端半边被组合进浏览器图。

3. 重新加载。带 `patchReload: live` 的 profile 会把新补丁应用到运行中的 host；否则重启 `dsh web` 并刷新一次页面。

## 验证

打开右侧栏，选择 **Files** tab，点击任意视频文件。tab 中会出现带原生控件的播放器。若浏览器无法解码该文件，面板会改为显示一行失败提示。

## 工作原理

插件只使用文档预览包公开的两个扩展点：

| 步骤 | API |
| --- | --- |
| 等待预览 owner | `inject = ['documentPreviews', 'slots', 'locale']` |
| 认领后缀 | `ctx.documentPreviews.register({ id, extensions, binaryExtensions, priority: 'extension', title, loading: 'bytes-complete', wrap: false })` |
| 渲染正文 | `ctx.slots.register({ name: 'sidebar.right.tab.document', key: id, locale: 'sidebarVideo' }, VideoBody)` |
| 持有副作用 | 每次注册都包在 `ctx.effect(...)` 中 |

插件不运行时 import 任何 harness 包：浏览器 bundle 把 `react` 与 `react/jsx-runtime` 保留为请求，由 shell 的共享模块表应答；同时 `dsh.client.inject` 指明文档预览包，使它的 bundle 先被加载。

如果打过补丁的 harness 自带的内置视频渲染器也在，它以另一个 id 注册在 `builtin` 档位，因此本插件在工具栏中胜出；只有两者都安装时才会同时出现两个候选。移除其中之一即可去掉重复项。

## 已知限制

- **整文件读取。** 渲染器使用 owner 的 `bytes-complete` 模式，所以视频必须不超过 Host 的 `maxFileBytes` 上限（默认 32 MiB）。它不使用分段请求；拖动进度可用，是因为整个文件已在 Blob 中。
- **不记忆播放位置。** 重新载入或重新挂载文档会回到开头，与文本滚动不同。
- **并非所有容器。** 未认领 `avi`、`mkv`、`flv` 和 `wmv`，因为 Chromium、Firefox 和 Safari 都无法独立解码它们。只有在文件的编码确实受浏览器支持时，才在 `src/client/index.ts` 中添加后缀。
- **没有字幕、章节或原生播放器之外的倍速界面。**

## 开发

```sh
pnpm install
pnpm run build      # lib/index.js（Node 半边）+ lib/client.js（浏览器 bundle）
pnpm run typecheck
pnpm test
```

`tests/artifact.test.ts` 会像 shell 那样加载构建产物 `lib/client.js`——通过模拟的 `window.__ModuleLoader__` 注册，并用模块表的 `require` 物化它——因此 bundle 契约一旦被破坏，失败会出现在测试套件里，而不是部署中。

## 许可

MIT。渲染器沿用 DeepSeek Harness 包 `@deepseek-ai/dsh-client-ui-sidebar-documentpreview`（MIT）的文档渲染器约定，本插件注册所用的扩展点由该包拥有。
