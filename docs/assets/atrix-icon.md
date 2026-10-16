# Atrix 应用图标

本次选用钴蓝三段环形标志与冰白底色。透明母版为 [atrix-icon-master.png](./atrix-icon-master.png)，所有平台图标均由它生成；不要手工修改导出文件。

## 重新生成

在 macOS 的仓库根目录运行（仅使用系统自带的 Swift、CoreGraphics 和 ImageIO，无额外依赖）：

```bash
swift scripts/generate-app-icons.swift
bun scripts/quality/run-vitest.mjs --run scripts/generate-app-icons.test.mjs
```

母版必须是至少 1024 × 1024 的正方形透明 PNG，并保留当前画布留白。统一底色为 `#EFF4FA`；蓝色保留母版中的折叠明暗。

生成范围：

- Desktop：`build/icon.png`、`icon-dock.png`、`icon.ico`、`icon.icns` 与 Renderer 的 `public/icon.png`。macOS 版本含透明外边距和圆角，Windows ICO 覆盖 16–256 像素，ICNS 覆盖 16–1024 像素。
- iOS：1024 像素、无透明通道、无预裁圆角的 `AppIcon.png`，由系统施加遮罩。
- Android：五档密度的普通、圆形及自适应图标；前景与底色分离，标志位于安全区域；通知和快捷设置图标使用同一标志的白色透明版本。
- 文档站：`public/images/atrix-app-icon.png` 与 `public/favicon.png`。

生成器只更新上述图标资源，不修改应用标识、协议、配置或桌宠素材。测试会检查各端尺寸、iOS 透明通道限制、ICO/ICNS 帧和从母版导出的完整流程；macOS 以外跳过依赖系统图像框架的重新生成用例，资源合同检查仍然运行。

## 生成来源与提示词

母版通过内置 `image_gen` 生成。先精修所选 C 配色，再提取透明标志；以下保留实际采用的两步提示词。冰白背景由本地导出流程统一填充，以保证各尺寸底色一致。

### 精修

```text
Use case: precise-object-edit.
Asset type: final production application icon master for atrix.
Input image 1 is the approved cobalt-blue logo on ice-white. Refine this SAME design for production; do not propose a new symbol.
Preserve exactly the same three curved folded ribbon segments, the triangular circulation silhouette, each segment's taper and direction, all three open gaps and the same central negative space. Keep the existing orientation. Keep rich cobalt blue surfaces and darker blue inner folds, with restrained smooth satin shading. No new facets or textures.
Make two production refinements only: (1) slightly reduce the entire emblem uniformly, maintaining its aspect ratio, to occupy approximately 70 percent of the canvas width and 68 percent of the canvas height, perfectly optically centered, with equal generous margins appropriate for iOS and desktop app-icon masks; (2) make the entire background perfectly uniform very pale ice blue #EFF4FA, including the central hole and gaps, eliminating all paper texture, grain or background gradients. Keep foreground cobalt base approximately #3565E9, highlights no lighter than #4978F5 and inner folds around #183A9F, with clean well-defined edges and strong local contrast. Preserve the approved simple fold lighting, no extra specular highlights, glow or cast shadows. Clean render at the highest practical resolution.
Output ONE square full-bleed opaque icon artwork only. Do not round the outer corners; platform masks will be applied separately. No frame, no labels, no typography, no watermark, no mockup. This is a careful refinement of the reference, NOT a reinterpretation.
```

### 透明母版

```text
Use case: background-extraction.
Input image 1 is the FINAL APPROVED atrix logo artwork. Remove ONLY the very pale ice-blue background, including the central hole and all three open gaps, replacing it with genuine alpha transparency.
Preserve the cobalt-blue three-ribbon emblem exactly as it is: identical silhouette, orientation, scale, position, canvas margins, each taper and curve, fold geometry, blue gradients, shadows within the folds and clean antialiased edges. No redesign, no recoloring, no new highlights, no new shapes. Do not trim or crop the canvas. The output must retain the same square composition and the entire logo at precisely the same scale. Preserve all existing emblem pixels as closely as possible; all background pixels should be fully transparent. No checkerboard painted into the artwork, no white matte, no border, no text. Output a clean transparent PNG logo master suitable for compositing into application icons.
```

