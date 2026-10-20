import { describe, expect, it } from "vitest";
import { toAtrixDisplayString, toAtrixDisplayValue } from "./brand-display-mapping";

describe("brand-display-mapping", () => {
	it("transforms Vetta to Atrix in plain strings", () => {
		expect(toAtrixDisplayString("在 Vetta 对话中使用飞书")).toBe("在 Atrix 对话中使用飞书");
		expect(toAtrixDisplayString("Vetta / Lark Suite")).toBe("Atrix / Lark Suite");
		expect(toAtrixDisplayString("启用后，Vetta 会安装最新版官方 @larksuite/cli。")).toBe(
			"启用后，Atrix 会安装最新版官方 @larksuite/cli。",
		);
		expect(toAtrixDisplayString("不额外引入 Vetta Action、MCP 服务或自定义 Agent Tool。")).toBe(
			"不额外引入 Atrix Action、MCP 服务或自定义 Agent Tool。",
		);
		expect(toAtrixDisplayString("OpenVetta 官方能力市场")).toBe("Atrix 官方能力市场");
	});

	it("preserves technical identifiers while transforming display text in objects", () => {
		const block = {
			type: "hero",
			eyebrow: "官方 CLI Provider",
			title: "在 Vetta 对话中使用飞书",
			description: "让 Agent 通过飞书官方 lark-cli 处理文档",
			badges: ["官方 lark-cli", "直接使用 Shell"],
			icon: "solar:command-bold",
			path: "abilities/plugins/feishu",
		};

		const result = toAtrixDisplayValue(block);

		expect(result.type).toBe("hero");
		expect(result.title).toBe("在 Atrix 对话中使用飞书");
		expect(result.icon).toBe("solar:command-bold");
		expect(result.path).toBe("abilities/plugins/feishu");
	});

	it("handles nested structures like feature-grids and steps", () => {
		const steps = {
			type: "steps",
			items: [
				{
					title: "直接向 Vetta 提需求",
					description: "确认能力权限后，Vetta 会检查 lark-cli",
				},
			],
		};

		const result = toAtrixDisplayValue(steps);
		expect(result.items[0].title).toBe("直接向 Atrix 提需求");
		expect(result.items[0].description).toBe("确认能力权限后，Atrix 会检查 lark-cli");
	});
});
