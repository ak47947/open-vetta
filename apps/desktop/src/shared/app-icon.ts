// 应用图标（设置 → 外观 → 应用图标）。主进程持久化并应用，renderer 只读写同一个 id。

/**
 * 出厂图标和各款可选图标使用 Atrix 标志。可选图标资源位于 build/app-icons/。
 * 雪白款继续使用历史 id `ermine`，兼容已保存的选择。
 */
export const APP_ICON_IDS = [
	"default",
	"red",
	"black",
	"light",
	"dark",
	"binary",
	"ermine",
	"coding",
	"design",
	"work",
	"study",
	"read",
	"game",
	"sport",
	"cook",
	"travel",
	"sleep",
] as const;

export type AppIconId = (typeof APP_ICON_IDS)[number];

export const APP_ICON_DEFAULT: AppIconId = "default";

export function isAppIconId(value: unknown): value is AppIconId {
	return typeof value === "string" && (APP_ICON_IDS as readonly string[]).includes(value);
}

/** 未知或缺失的值回落默认，兼容将来删减图标后的旧配置。 */
export function normalizeAppIconId(value: unknown): AppIconId {
	return isAppIconId(value) ? value : APP_ICON_DEFAULT;
}
