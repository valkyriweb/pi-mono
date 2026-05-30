import { Container, getKeybindings, Spacer, Text } from "@valkyriweb/pi-tui";
import { type AgentRecentRun, formatAgentDurationMs } from "../../../core/agents/status.ts";
import type { AgentToolStatus } from "../../../core/agents/types.ts";
import { theme } from "../theme/theme.ts";
import { DynamicBorder } from "./dynamic-border.ts";
import { keyHint, rawKeyHint } from "./keybinding-hints.ts";

export type AgentRunsSelectorAction = "detail" | "interrupt" | "cancel" | "resume";

export class AgentRunsSelectorComponent extends Container {
	private readonly getRuns: () => AgentRecentRun[];
	private readonly onAction: (action: AgentRunsSelectorAction, run: AgentRecentRun) => void;
	private readonly onCancel: () => void;
	private selectedIndex = 0;
	private displayedRuns: AgentRecentRun[] = [];
	private readonly listContainer = new Container();
	private readonly detailText = new Text("", 1, 0);

	constructor(
		getRuns: () => AgentRecentRun[],
		onAction: (action: AgentRunsSelectorAction, run: AgentRecentRun) => void,
		onCancel: () => void,
	) {
		super();
		this.getRuns = getRuns;
		this.onAction = onAction;
		this.onCancel = onCancel;
		this.rebuild();
	}

	private selectedRun(): AgentRecentRun | undefined {
		return this.displayedRuns[this.selectedIndex];
	}

	private statusText(status: AgentToolStatus): string {
		switch (status) {
			case "completed":
				return theme.fg("success", status);
			case "failed":
			case "cancelled":
				return theme.fg("error", status);
			case "interrupted":
				return theme.fg("warning", status);
			default:
				return theme.fg("accent", status);
		}
	}

	private formatDuration(run: AgentRecentRun): string {
		return run.durationMs !== undefined ? formatAgentDurationMs(run.durationMs) : "running";
	}

	private formatRunRow(run: AgentRecentRun, selected: boolean): string {
		const prefix = selected ? `${theme.fg("accent", "→ ")}` : "  ";
		const id = selected ? theme.fg("accent", run.id) : theme.fg("text", run.id);
		const execution = run.execution === "background" ? "bg" : "fg";
		const resumable = run.resumable ? theme.fg("warning", " resumable") : "";
		const attention = run.needsAttention ? theme.fg("warning", " needs attention") : "";
		return `${prefix}${id} ${execution} ${this.statusText(run.status)}${resumable}${attention} ${theme.fg("muted", run.agents.join(", "))}`;
	}

	private formatDetail(run: AgentRecentRun | undefined): string {
		if (!run) return theme.fg("muted", "No native agent runs yet");
		const lines = [
			`${theme.fg("accent", run.id)} ${run.mode} ${run.execution} ${run.status} ${this.formatDuration(run)}`,
			`agents: ${run.agents.join(", ") || "n/a"}`,
		];
		if (run.resumable) lines.push(`resumable: yes (${keyHint("app.agents.resume", "resume")})`);
		if (run.needsAttention) lines.push(`needs attention: ${run.attentionMessage ?? "check run"}`);
		if (run.sessionRefs.length > 0) {
			lines.push(
				`sessions: ${run.sessionRefs
					.map((ref) => ref.sessionId ?? ref.sessionPath)
					.filter(Boolean)
					.join(", ")}`,
			);
		}
		if (run.outputPaths.length > 0) lines.push(`outputs: ${run.outputPaths.join(", ")}`);
		if (run.error) lines.push(`error: ${run.error}`);
		return lines.join("\n");
	}

	private rebuild(): void {
		this.clear();
		this.listContainer.clear();
		const runs = this.getRuns();
		this.displayedRuns = runs;
		if (runs.length === 0) {
			this.selectedIndex = 0;
			this.listContainer.addChild(new Text(theme.fg("muted", "No native agent runs yet"), 1, 0));
		} else {
			this.selectedIndex = Math.max(0, Math.min(this.selectedIndex, runs.length - 1));
			for (const [index, run] of runs.entries()) {
				this.listContainer.addChild(new Text(this.formatRunRow(run, index === this.selectedIndex), 1, 0));
			}
		}
		this.detailText.setText(this.formatDetail(this.selectedRun()));

		this.addChild(new DynamicBorder());
		this.addChild(new Spacer(1));
		this.addChild(new Text(theme.fg("accent", theme.bold("Agent Runs")), 1, 0));
		this.addChild(new Spacer(1));
		this.addChild(this.listContainer);
		this.addChild(new Spacer(1));
		this.addChild(this.detailText);
		this.addChild(new Spacer(1));
		this.addChild(
			new Text(
				rawKeyHint("↑↓", "navigate") +
					"  " +
					keyHint("tui.select.confirm", "details") +
					"  " +
					keyHint("app.agents.interrupt", "interrupt") +
					"  " +
					keyHint("app.agents.cancel", "cancel") +
					"  " +
					keyHint("app.agents.resume", "resume") +
					"  " +
					keyHint("tui.select.cancel", "close"),
				1,
				0,
			),
		);
		this.addChild(new Spacer(1));
		this.addChild(new DynamicBorder());
	}

	override invalidate(): void {
		super.invalidate();
		this.rebuild();
	}

	handleInput(keyData: string): void {
		const runs = this.displayedRuns;
		const kb = getKeybindings();
		if (kb.matches(keyData, "tui.select.up")) {
			this.selectedIndex = Math.max(0, this.selectedIndex - 1);
			this.rebuild();
			return;
		}
		if (kb.matches(keyData, "tui.select.down")) {
			this.selectedIndex = Math.min(Math.max(0, runs.length - 1), this.selectedIndex + 1);
			this.rebuild();
			return;
		}
		if (kb.matches(keyData, "tui.select.cancel")) {
			this.onCancel();
			return;
		}
		const selected = this.selectedRun();
		if (!selected) return;
		if (kb.matches(keyData, "tui.select.confirm")) {
			this.onAction("detail", selected);
			return;
		}
		if (kb.matches(keyData, "app.agents.interrupt")) {
			this.onAction("interrupt", selected);
			return;
		}
		if (kb.matches(keyData, "app.agents.cancel")) {
			this.onAction("cancel", selected);
			return;
		}
		if (kb.matches(keyData, "app.agents.resume")) {
			this.onAction("resume", selected);
		}
	}
}
