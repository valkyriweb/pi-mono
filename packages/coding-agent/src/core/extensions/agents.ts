import { truncateToWidth } from "@valkyriweb/pi-tui";
import { AGENTS_ENGINE_SERVICE_ID, type AgentEngine } from "../agents/engine.ts";
import { formatAgentFooterStatus, formatAgentStatus, subscribeAgentRecentRuns } from "../agents/status.ts";
import {
	createAgentToolDefinition,
	createTaskToolDefinition,
	createUppercaseAgentToolDefinition,
} from "../tools/agent.ts";
import { addAction, load } from "./extension-hooks.ts";
import type { ExtensionAPI, ExtensionMainPaneComponent, ExtensionMainPaneFactory } from "./types.ts";

const AGENTS_PANE_ID = "agents-status";

function getAgentEngine(pi: ExtensionAPI): AgentEngine | undefined {
	return pi.harness.use<AgentEngine>(AGENTS_ENGINE_SERVICE_ID);
}

export function hookAgents(pi: ExtensionAPI): void {
	const options = {
		getEngine: () => getAgentEngine(pi),
		getParentModel: () => getAgentEngine(pi)?.snapshot().model,
		getParentThinkingLevel: () => getAgentEngine(pi)?.snapshot().thinkingLevel ?? "off",
	};
	pi.registerTool(createAgentToolDefinition("", options));
	pi.registerTool(createUppercaseAgentToolDefinition("", options));
	pi.registerTool(createTaskToolDefinition("", options));

	pi.registerMainPane(AGENTS_PANE_ID, agentsPaneFactory);

	// Background-agent status pill ("Agents: 1 running · ..."). Reactive
	// visibility: the pill appears only when there are active background runs.
	pi.registerFooter(AGENTS_PANE_ID, {
		render: () => formatAgentFooterStatus() ?? "",
		visible: () => formatAgentFooterStatus() !== undefined,
		onActivate: () => pi.showMainPane(AGENTS_PANE_ID),
	});
}

class AgentsPane implements ExtensionMainPaneComponent {
	private readonly tui: { requestRender(): void };
	private readonly theme: any;
	private readonly requestHide: () => void;
	private readonly unsubscribe: () => void;

	constructor(tui: { requestRender(): void }, theme: any, requestHide: () => void) {
		this.tui = tui;
		this.theme = theme;
		this.requestHide = requestHide;
		this.unsubscribe = subscribeAgentRecentRuns(() => this.tui.requestRender());
	}

	dispose(): void {
		this.unsubscribe();
	}

	onEscape(): boolean {
		this.requestHide();
		return true;
	}

	invalidate(): void {}

	handleInput(data: string): void {
		if (data === "\u001b") this.requestHide();
	}

	render(width: number): string[] {
		const lines = formatAgentStatus().split("\n");
		lines.splice(2, 0, this.theme.fg("dim", "esc close"));
		return lines.slice(0, 28).map((line, index) => {
			const styled = index === 0 ? this.theme.fg("accent", this.theme.bold(line)) : line;
			return truncateToWidth(styled, width, this.theme.fg("dim", "…"));
		});
	}
}

const agentsPaneFactory: ExtensionMainPaneFactory = (tui, theme, api) => new AgentsPane(tui, theme, api.requestHide);

addAction(load, "agents", hookAgents);
