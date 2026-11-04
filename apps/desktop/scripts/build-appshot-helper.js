// 把 native/appshot/main.swift 编译打包成 `Atrix Computer Use.app`（swiftc 单文件
// 编译到 Contents/MacOS/、写 Info.plist、拷贝主 app icns、ad-hoc 签名）。
//
// 独立 .app bundle（独立 CFBundleIdentifier）使其在 macOS TCC（辅助功能/屏幕
// 录制）里是与主 Atrix app 分离的授权主体，系统设置权限列表显示为
// "Atrix Computer Use"。
//
// darwin-only：非 macOS host 直接跳过（appshot 功能本身仅 macOS 提供）。
// 幂等：产物已存在且可执行文件 mtime 晚于源码时跳过编译，加速 dev 启动与迭代构建。
//
// 用法：node build-appshot-helper.js [--out <dir>]
//   --out: 产物输出目录（打包时由 prepare-pack.js 传 staging 目录）。
//          缺省输出到 resources/appshot/bin/（dev 运行时路径，
//          与 src/main/appshot/helper-resolver.ts 保持一致）。

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = join(import.meta.dirname, "..");
const sourcePath = join(projectRoot, "native", "appshot", "main.swift");
const iconSourcePath = join(projectRoot, "build", "icon.icns");

const APP_NAME = "Atrix Computer Use";
// 内部授权标识保持上游原值：TCC 授权与 bundle id 绑定，改名会让已授权用户的
// 授权失效；系统设置里展示的名字取自 CFBundleDisplayName / bundle 文件名。
const BUNDLE_ID = "com.vetta.desktop.computer-use";
// 品牌重塑前产出的旧 bundle 名，编译前清理，避免 dev 目录里新旧两份并存。
const LEGACY_APP_NAMES = ["Vetta Computer Use"];

function resolveOutDir() {
	const outIndex = process.argv.indexOf("--out");
	if (outIndex >= 0 && process.argv[outIndex + 1]) {
		return process.argv[outIndex + 1];
	}
	return join(projectRoot, "resources", "appshot", "bin");
}

function infoPlistContents() {
	return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleIdentifier</key>
	<string>${BUNDLE_ID}</string>
	<key>CFBundleName</key>
	<string>${APP_NAME}</string>
	<key>CFBundleDisplayName</key>
	<string>${APP_NAME}</string>
	<key>CFBundleExecutable</key>
	<string>${APP_NAME}</string>
	<key>CFBundlePackageType</key>
	<string>APPL</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleIconFile</key>
	<string>icon</string>
	<key>LSUIElement</key>
	<true/>
	<key>LSMinimumSystemVersion</key>
	<string>13.0</string>
	<key>NSScreenCaptureUsageDescription</key>
	<string>${APP_NAME} needs to record your screen to capture the active window for the assistant.</string>
</dict>
</plist>
`;
}

function removeLegacyBundles(outDir) {
	for (const name of LEGACY_APP_NAMES) {
		const legacyBundlePath = join(outDir, `${name}.app`);
		if (!existsSync(legacyBundlePath)) continue;
		console.log(`[build-appshot-helper] removing legacy bundle: ${legacyBundlePath}`);
		rmSync(legacyBundlePath, { recursive: true, force: true });
	}
}

function main() {
	if (process.platform !== "darwin") {
		console.log(`[build-appshot-helper] skipped on non-darwin host: ${process.platform}`);
		return;
	}
	if (!existsSync(sourcePath)) {
		throw new Error(`build-appshot-helper: source not found: ${sourcePath}`);
	}

	const outDir = resolveOutDir();
	const appBundlePath = join(outDir, `${APP_NAME}.app`);
	const contentsDir = join(appBundlePath, "Contents");
	const macosDir = join(contentsDir, "MacOS");
	const resourcesDir = join(contentsDir, "Resources");
	const executablePath = join(macosDir, APP_NAME);

	removeLegacyBundles(outDir);

	if (
		existsSync(executablePath) &&
		statSync(executablePath).mtimeMs > statSync(sourcePath).mtimeMs
	) {
		console.log(`[build-appshot-helper] up to date, skipping: ${appBundlePath}`);
		return;
	}

	mkdirSync(macosDir, { recursive: true });
	mkdirSync(resourcesDir, { recursive: true });

	// 显式指定部署目标：swiftc 默认以宿主系统版本为 target，编出的二进制会
	// 要求最新 macOS。Electron 34 支持 macOS 11+，这里取 13.0（ScreenCaptureKit
	// 可用，SCScreenshotManager 走 #available(macOS 14) 分支）。
	const swiftArch = process.arch === "x64" ? "x86_64" : process.arch;
	console.log(`[build-appshot-helper] swiftc -> ${executablePath}`);
	execFileSync(
		"swiftc",
		["-O", "-target", `${swiftArch}-apple-macos13.0`, "-o", executablePath, sourcePath],
		{ stdio: "inherit" },
	);

	writeFileSync(join(contentsDir, "Info.plist"), infoPlistContents());

	if (existsSync(iconSourcePath)) {
		cpSync(iconSourcePath, join(resourcesDir, "icon.icns"));
	} else {
		console.warn(`[build-appshot-helper] icon source not found, skipping: ${iconSourcePath}`);
	}

	console.log(`[build-appshot-helper] codesign (ad-hoc) -> ${appBundlePath}`);
	execFileSync("codesign", ["-s", "-", "--force", "--deep", appBundlePath], { stdio: "inherit" });
}

main();
