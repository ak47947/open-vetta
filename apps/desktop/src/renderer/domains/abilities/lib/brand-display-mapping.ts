/**
 * 展示层品牌映射适配（Display Mapping）
 *
 * 根据《AGENTS.md》品牌重塑与上游同步规范：
 * - 呈现层全面 Atrix：在所有最终用户可见、可感知的界面、文案、错误提示、通知、
 *   模板及用户文档中，绝对不允许出现 “Vetta” 或 “OpenVetta”，统一展示为 Atrix。
 * - 解耦方式（展示映射与配置适配）：
 *   当底层或上游能力市场数据包含原有名称时，在展示层建立映射适配转译为 Atrix，
 *   避免直接修改协议或分叉上游。
 */

const PRESERVED_KEYS = new Set([
	"id",
	"slug",
	"kind",
	"type",
	"src",
	"icon",
	"href",
	"path",
	"sha256",
	"url",
	"license",
	"category",
]);

/**
 * 将展示文本中的 Vetta 品牌名称转译为 Atrix
 */
export function toAtrixDisplayString(value: string): string {
	if (!value) return value;
	return value
		.replace(/Open\s*Vetta/gi, "Atrix")
		.replace(/open-vetta/gi, "atrix")
		.replace(/Vetta(?:\s+Official)/gi, "Atrix Official")
		.replace(/Vetta(?:\s+Action)/gi, "Atrix Action")
		.replace(/(?<!@)Vetta/g, "Atrix")
		.replace(/(?<!@)vetta/g, "atrix");
}

/**
 * 递归转译对象、数组或标量值中的展示文本，保留技术标识键（id/type/icon/path 等）原样不变
 */
export function toAtrixDisplayValue<T>(value: T): T {
	if (typeof value === "string") {
		return toAtrixDisplayString(value) as unknown as T;
	}
	if (Array.isArray(value)) {
		return value.map((item) => toAtrixDisplayValue(item)) as unknown as T;
	}
	if (value !== null && typeof value === "object") {
		const record = value as Record<string, unknown>;
		const result: Record<string, unknown> = {};
		for (const [key, val] of Object.entries(record)) {
			if (PRESERVED_KEYS.has(key)) {
				result[key] = val;
			} else {
				result[key] = toAtrixDisplayValue(val);
			}
		}
		return result as unknown as T;
	}
	return value;
}
