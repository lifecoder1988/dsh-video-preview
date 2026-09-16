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
		//#region src/client/VideoBody.tsx
		/**
		* The video renderer body: complete file bytes played by the browser's own
		* player, sized to the document pane.
		*
		* Playback support belongs to the browser's decoder. A container or codec it
		* cannot decode fails the player rather than the read — the bytes were already
		* complete — and the failure line replaces the player.
		*/
		/** Container suffixes a browser decodes from a Blob URL, with the media type its Blob carries. */
		const VIDEO_MEDIA_TYPES = {
			mp4: "video/mp4",
			m4v: "video/mp4",
			mov: "video/quicktime",
			webm: "video/webm",
			ogv: "video/ogg"
		};
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
		* Resolve a supported filename to the media type assigned to its Blob.
		* @param path - decoded workspace file path.
		* @returns the video media type, or undefined for an unregistered suffix.
		*/
		function videoMediaType(path) {
			const name = fileNameOf(path).toLowerCase();
			const extension = name.slice(name.lastIndexOf(".") + 1);
			return VIDEO_MEDIA_TYPES[extension];
		}
		/**
		* Play complete video bytes through the browser's native player.
		* @param props - prepared content, file address, and copy.
		* @returns the player in a full-width frame, or the status that replaces it.
		*/
		function VideoBody({ content, resourceAddress, t }) {
			const path = (0, react.useMemo)(() => filePathOf(resourceAddress), [resourceAddress]);
			const mediaType = videoMediaType(path);
			const data = content.kind === "bytes" ? content.data : void 0;
			const [source, setSource] = (0, react.useState)();
			const [playback, setPlayback] = (0, react.useState)("pending");
			(0, react.useEffect)(() => {
				if (data === void 0 || mediaType === void 0) return;
				let url;
				setPlayback("pending");
				try {
					url = URL.createObjectURL(new Blob([data], { type: mediaType }));
					setSource({
						kind: "ready",
						data,
						mediaType,
						url
					});
				} catch {
					setSource({
						kind: "failed",
						data,
						mediaType
					});
				}
				return () => {
					if (url !== void 0) URL.revokeObjectURL(url);
				};
			}, [data, mediaType]);
			if (data === void 0 || mediaType === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				style: STATUS,
				role: "alert",
				children: t("unsupported")
			});
			if (source?.data !== data || source.mediaType !== mediaType) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				style: STATUS,
				role: "status",
				children: t("loading")
			});
			if (source.kind === "failed" || playback === "failed") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				style: STATUS,
				role: "alert",
				children: t("failed")
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: FRAME,
				"data-video-preview": true,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("video", {
					style: PLAYER,
					src: source.url,
					controls: true,
					playsInline: true,
					preload: "metadata",
					"aria-label": t("preview", { name: fileNameOf(path) }),
					"data-video-player": true,
					onError: () => {
						setPlayback("failed");
					}
				})
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
			unsupported: "Video preview requires the complete file contents."
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
		/** Container suffixes the browser's own decoder plays from a Blob URL. */
		const VIDEO_EXTENSIONS = [
			"mp4",
			"m4v",
			"mov",
			"webm",
			"ogv"
		];
		/** Locale namespace carrying this renderer's labels. */
		const VIDEO_LOCALE_NAMESPACE = "sidebarVideo";
		/**
		* Describe the video renderer independently of its keyed body slot.
		* Every suffix is binary: a player decodes container bytes, never text.
		* @param title - locale-owned implementation name.
		* @returns metadata for complete video files.
		*/
		function videoBodyDefinition(title) {
			return {
				id: VIDEO_BODY_ID,
				extensions: VIDEO_EXTENSIONS,
				binaryExtensions: VIDEO_EXTENSIONS,
				priority: "extension",
				title,
				loading: "bytes-complete",
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
		exports.VIDEO_EXTENSIONS = VIDEO_EXTENSIONS;
		exports.VIDEO_LOCALE_NAMESPACE = VIDEO_LOCALE_NAMESPACE;
		exports.apply = apply;
		exports.inject = inject;
		exports.videoBodyDefinition = videoBodyDefinition;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map