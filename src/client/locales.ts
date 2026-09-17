/** Locale-owned video renderer labels and status text. */

/** Chinese dictionary; its keys define the namespace's key set. */
export const zh = {
  title: '视频',
  preview: '视频预览：{name}',
  loading: '正在读取…',
  failed: '无法播放这个视频：容器或编码不受浏览器支持',
  unsupported: '视频预览需要完整文件内容',
} satisfies Record<string, string>

/** Video renderer dictionary keys. */
export type VideoPreviewKey = keyof typeof zh

/** Translate function bound to this renderer's namespace. */
export type VideoTranslate = (key: VideoPreviewKey, params?: Record<string, unknown>) => string

/** English dictionary with the same keys as the Chinese dictionary. */
export const en = {
  title: 'Video',
  preview: 'Video preview: {name}',
  loading: 'Reading…',
  failed: 'This video could not be played: the browser does not support its container or codec.',
  unsupported: 'Video preview requires the file’s complete path.',
} satisfies Record<VideoPreviewKey, string>
