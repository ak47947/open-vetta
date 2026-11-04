// appshot helper 的 bundle 名会直接出现在系统设置（辅助功能 / 屏幕录制）的应用
// 列表里，因此既是用户可见的品牌面，又必须与构建脚本产出的目录名逐字符一致：
// 不一致时 resolveAppshotHelperBinary() 找不到二进制，应用快照整条链路静默失效。
// 这两点都由本文件守住。

import { readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAppshotHelperBinary, resolveHelperAppBundlePath } from "./helper-resolver.js";

const electronAppMock = vi.hoisted(() => ({ isPackaged: false }));

vi.mock("electron", () => ({ app: electronAppMock }));

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILD_SCRIPT_PATH = join(HERE, "..", "..", "..", "scripts", "build-appshot-helper.js");
const buildScriptSource = readFileSync(BUILD_SCRIPT_PATH, "utf8");

/** 构建脚本实际产出的 `.app` 名（去掉扩展名），是 bundle 名的唯一事实源。 */
function buildScriptAppName(): string {
	const match = /\bconst APP_NAME = "([^"]+)";/.exec(buildScriptSource);
	if (!match) throw new Error("APP_NAME not found in scripts/build-appshot-helper.js");
	return match[1];
}

describe("appshot helper resolver", () => {
	beforeEach(() => {
		electronAppMock.isPackaged = false;
	});

	it("系统设置里展示的 helper 名是 Atrix Computer Use", () => {
		expect(buildScriptAppName()).toBe("Atrix Computer Use");

		// Info.plist 的屏幕录制用途说明必须由 APP_NAME 插值生成，否则改名后会残留旧品牌。
		const appNamePlaceholder = "$" + "{APP_NAME}";
		expect(buildScriptSource).toContain(`${appNamePlaceholder} needs to record your screen`);
	});

	it("dev 模式解析到构建脚本产出的同名 bundle", () => {
		const appName = buildScriptAppName();
		const bundlePath = resolveHelperAppBundlePath();

		expect(basename(bundlePath)).toBe(`${appName}.app`);
		expect(bundlePath.endsWith(join("resources", "appshot", "bin", `${appName}.app`))).toBe(true);
	});

	it("打包模式从 Resources/appshot 解析，且可执行文件名与 bundle 名一致", () => {
		const appName = buildScriptAppName();
		const resourcesPath = join(HERE, "__fixtures__", "no-helper-here");
		Object.defineProperty(process, "resourcesPath", { value: resourcesPath, configurable: true });
		electronAppMock.isPackaged = true;

		const bundlePath = resolveHelperAppBundlePath();
		expect(bundlePath).toBe(join(resourcesPath, "appshot", `${appName}.app`));

		expect(() => resolveAppshotHelperBinary()).toThrow(
			join("appshot", `${appName}.app`, "Contents", "MacOS", appName),
		);
	});
});
