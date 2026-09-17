window.__ModuleLoader__.load({
	id: "dsh-video-preview",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		/**
		* Decode the workspace path from a session file address.
		* @param address - a `dsh-resource://file/session/…` address, or any string.
		* @returns the decoded path, the address itself when it is not a session file
		* address, or the undecoded remainder when a segment is malformed.
		*/
		function filePathOf(address) {
			if (!address.startsWith("dsh-resource://file/session/")) return address;
			const remainder = address.slice(28);
			const separator = remainder.indexOf("/");
			if (separator === -1) return address;
			const encoded = remainder.slice(separator + 1);
			if (encoded === "") return address;
			try {
				return encoded.split("/").map((segment) => decodeURIComponent(segment)).join("/");
			} catch {
				return encoded;
			}
		}
		/**
		* The final path segment of a decoded path.
		* @param path - decoded workspace path, POSIX or Windows shaped.
		* @returns the file name, or the path itself when it carries no separator.
		*/
		function fileNameOf(path) {
			const normalized = path.replaceAll("\\", "/");
			return normalized.slice(normalized.lastIndexOf("/") + 1);
		}
		//#endregion
		//#region src/client/suffix.ts
		/** Container suffixes the browser's own decoder plays straight from a file route. */
		/** Suffixes this renderer claims; every one is a binary container, never text. */
		const VIDEO_EXTENSIONS = [
			"mp4",
			"m4v",
			"mov",
			"webm",
			"ogv"
		];
		/**
		* Whether a decoded path carries a suffix this renderer plays.
		* @param path - decoded workspace file path, POSIX or Windows shaped.
		* @returns true when the file's suffix is one of {@link VIDEO_EXTENSIONS}.
		*/
		function isPlayableVideo(path) {
			const normalized = path.replaceAll("\\", "/");
			const name = normalized.slice(normalized.lastIndexOf("/") + 1).toLowerCase();
			const extension = name.slice(name.lastIndexOf(".") + 1);
			return VIDEO_EXTENSIONS.includes(extension);
		}
		//#endregion
		//#region src/client/VideoBody.tsx
		/**
		* The video renderer body: the file streams from the Host's own file route into
		* the browser's player, sized to the document pane.
		*
		* The renderer reads nothing. It addresses the file and the browser issues ranged
		* requests, so a file of any size plays with bounded memory and seeks without a
		* whole-file transfer. Playback support belongs to the browser's decoder: a
		* container or codec it cannot decode fails the player, and the failure line
		* replaces it.
		*/
		/** The frame follows the scroller's width, so the player shrinks to the pane. */
		const FRAME = {
			display: "flex",
			boxSizing: "border-box",
			width: "100%",
			minHeight: "100%",
			padding: 12,
			fontFamily: "var(--dsw-font, sans-serif)",
			whiteSpace: "normal"
		};
		/** The player fills the frame's content box at its intrinsic aspect ratio. */
		const PLAYER = {
			display: "block",
			width: "100%",
			maxWidth: "100%",
			height: "auto",
			margin: "auto",
			borderRadius: 8,
			background: "#000"
		};
		/** One status line replaces the player for loading, refusal, and failure. */
		const STATUS = {
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			boxSizing: "border-box",
			width: "100%",
			minHeight: "100%",
			margin: 0,
			padding: 10,
			color: "var(--dsw-alias-label-secondary)",
			fontSize: 13,
			lineHeight: 1.5,
			whiteSpace: "normal"
		};
		/**
		* Same-origin URL serving one Host file, which the browser streams by range.
		*
		* The preview is always served by the Host over HTTP(S); a document opened under
		* any other protocol (a `file:` page) cannot address the route, so the relative
		* path is returned there and the player reports its own failure.
		* @param absolutePath - the file's absolute path in the execution world.
		* @param location - page location supplying the origin, injected for tests.
		* @returns the file-route URL for that path.
		*/
		function fileRouteUrl(absolutePath, location) {
			const path = `/api/file?path=${encodeURIComponent(absolutePath)}`;
			return location.protocol === "http:" || location.protocol === "https:" ? `${location.origin}${path}` : path;
		}
		/**
		* Stream a video file from the Host's route through the browser's player.
		* @param props - the file address, the standard resource hook, and copy.
		* @returns the player inside a full-width frame, or the state that replaces it.
		*/
		function VideoBody({ resourceAddress, useResource, t }) {
			const path = (0, react.useMemo)(() => filePathOf(resourceAddress), [resourceAddress]);
			const absolutePath = useResource(resourceAddress).value?.absolutePath;
			const [failedPath, setFailedPath] = (0, react.useState)();
			if (!isPlayableVideo(path)) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				style: STATUS,
				role: "alert",
				children: t("unsupported")
			});
			if (absolutePath === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				style: STATUS,
				role: "status",
				"aria-label": t("loading"),
				"data-video-loading": true
			});
			if (failedPath === absolutePath) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				style: STATUS,
				role: "alert",
				children: t("failed")
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: FRAME,
				"data-video-preview": true,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("video", {
					style: PLAYER,
					src: fileRouteUrl(absolutePath, window.location),
					controls: true,
					playsInline: true,
					preload: "metadata",
					"aria-label": t("preview", { name: fileNameOf(path) }),
					"data-video-player": true,
					onError: () => {
						setFailedPath(absolutePath);
					}
				}, absolutePath)
			});
		}
		//#endregion
		//#region src/client/locales.ts
		/** Locale-owned video renderer labels and status text. */
		/** Chinese dictionary; its keys define the namespace's key set. */
		const zh = {
			title: "视频",
			preview: "视频预览：{name}",
			loading: "正在读取…",
			failed: "无法播放这个视频：容器或编码不受浏览器支持",
			unsupported: "视频预览需要完整文件内容"
		};
		/** English dictionary with the same keys as the Chinese dictionary. */
		const en = {
			title: "Video",
			preview: "Video preview: {name}",
			loading: "Reading…",
			failed: "This video could not be played: the browser does not support its container or codec.",
			unsupported: "Video preview requires the file’s complete path."
		};
		//#endregion
		//#region src/client/index.ts
		/**
		* Browser half of the plugin: register the video renderer with the right
		* Sidebar's document preview.
		*
		* Two public extension points carry the whole feature: metadata goes to
		* `ctx.documentPreviews`, whose registry the preview owner publishes, and the
		* component goes to the keyed `sidebar.right.tab.document` child slot, whose
		* cell key is the implementation id. The `inject` declaration keeps this
		* plugin waiting until those services exist, so it never registers into a
		* registry that is not there yet.
		*/
		/** Services this plugin cannot run without. */
		const inject = [
			"documentPreviews",
			"slots",
			"locale"
		];
		/** This implementation's identity, shared by its metadata and its slot cell. */
		const VIDEO_BODY_ID = "dsh-video-preview/video";
		/** Locale namespace carrying this renderer's labels. */
		const VIDEO_LOCALE_NAMESPACE = "sidebarVideo";
		/**
		* Describe the video renderer independently of its keyed body slot.
		*
		* The renderer streams through the Host file route, so it declares `url`: the
		* preview owner reads nothing, and a produced file stays playable however large
		* it grows. Every suffix is binary, and a player decodes the container itself.
		* @param title - locale-owned implementation name.
		* @returns metadata for playable video files.
		*/
		function videoBodyDefinition(title) {
			return {
				id: VIDEO_BODY_ID,
				extensions: VIDEO_EXTENSIONS,
				binaryExtensions: VIDEO_EXTENSIONS,
				priority: "extension",
				title,
				loading: "url",
				wrap: false
			};
		}
		/**
		* Register the dictionary, the metadata, and the body, each owned by an effect
		* so stopping or updating the plugin removes exactly what it added.
		* @param ctx - the client context carrying the three injected services.
		*/
		function apply(ctx) {
			const t = ctx.locale.bind(VIDEO_LOCALE_NAMESPACE);
			ctx.effect(() => ctx.locale.register(VIDEO_LOCALE_NAMESPACE, {
				zh,
				en
			}), "dsh-video-preview: dictionaries");
			ctx.effect(() => ctx.documentPreviews.register(videoBodyDefinition(() => t("title"))), "dsh-video-preview: metadata");
			ctx.effect(() => ctx.slots.inject("sidebar.right.tab.document", () => ctx.slots.register({
				name: "sidebar.right.tab.document",
				key: VIDEO_BODY_ID,
				locale: VIDEO_LOCALE_NAMESPACE
			}, VideoBody)), "dsh-video-preview: body");
		}
		//#endregion
		exports.VIDEO_BODY_ID = VIDEO_BODY_ID;
		exports.VIDEO_LOCALE_NAMESPACE = VIDEO_LOCALE_NAMESPACE;
		exports.apply = apply;
		exports.inject = inject;
		exports.videoBodyDefinition = videoBodyDefinition;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map