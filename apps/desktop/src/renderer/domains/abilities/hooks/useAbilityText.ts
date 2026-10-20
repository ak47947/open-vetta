import { useCallback } from "react";
import { usePluginI18n } from "../../plugins/runtime/plugin-i18n";
import { toAtrixDisplayString } from "../lib/brand-display-mapping";
import type { AbilityItem } from "../types";

/**
 * 插件的 name / description 可能是 `%catalogKey%` 占位符（ADR-0033），需要用插件自带
 * catalog 解析；其余 type 直接透传。条目组装是纯函数，故解析放在渲染期。
 * 所有用户可见标题与描述统一通过 toAtrixDisplayString 转译为 Atrix。
 */
export function useAbilityText(): (item: AbilityItem) => { title: string; description: string } {
	const tr = usePluginI18n();
	return useCallback(
		(item) => {
			if (item.type === "plugin" && item.plugin) {
				return {
					title: toAtrixDisplayString(tr(item.plugin, item.title)),
					description: toAtrixDisplayString(tr(item.plugin, item.description)),
				};
			}
			return {
				title: toAtrixDisplayString(item.title),
				description: toAtrixDisplayString(item.description),
			};
		},
		[tr],
	);
}
