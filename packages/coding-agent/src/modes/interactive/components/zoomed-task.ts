/**
 * ZoomedTaskComponent — main-pane view when the user "zooms into" a running
 * background agent task.
 *
 * Renders a header (task id, agents, status) followed by the live tail of
 * `TaskMessageEvent`s buffered by `core/tasks/messages.ts`. The component owns
 * the subscription to `subscribeTaskMessages(taskId,…)` so it can re-render
 * incrementally as the child agent emits new events.
 *
 * Perf model (revised after live testing showed render storm):
 *   - **Append-only**: when new events land, we only `addChild` the delta,
 *     never `clear()` + rebuild the whole subtree. With multiple background
 *     agents each emitting tool events every few hundred ms, full rebuilds
 *     burned the main thread.
 *   - **Coalesced**: multiple `subscribeTaskMessages` notifications in the
 *     same tick fold into one render via `queueMicrotask`.
 *   - **Header refresh only on status change**: status is read inside the
 *     header `Text`'s render path via a closure (cheap recompute on each
 *     paint, no subscription needed). Auto-pop on terminal state still lives
 *     in `InteractiveMode` — the component itself doesn't need to listen.
 */

import { type Component, Container, Spacer, Text, type TUI } from "@earendil-works/pi-tui";
import { getLiveSession } from "../../../core/agents/live-sessions.ts";
import { findAgentRecentRun, formatAgentDurationMs } from "../../../core/agents/status.ts";
import { getTaskMessages, subscribeTaskMessages, type TaskMessageEvent } from "../../../core/tasks/index.ts";
import { theme } from "../theme/theme.ts";
import { DynamicBorder } from "./dynamic-border.ts";
import { type ZoomedSessionConfig, ZoomedSessionTranscript } from "./zoomed-session-transcript.ts";

const PREVIEW_MAX = 120;

function truncate(text: string, max = PREVIEW_MAX): string {
	const single = text.replace(/\s+/g, " ").trim();
	return single.length > max ? `${single.slice(0, max - 1)}…` : single;
}

function statusColor(status: string): string {
	switch (status) {
		case "completed":
			return theme.fg("success", status);
		case "failed":
		case "cancelled":
		case "killed":
			return theme.fg("error", status);
		case "interrupted":
			return theme.fg("warning", status);
		default:
			return theme.fg("accent", status);
	}
}

function renderEvent(event: TaskMessageEvent): string {
	switch (event.kind) {
		case "assistant_text":
			return theme.fg("text", truncate(event.text, 400));
		case "assistant_end":
			return theme.fg("muted", "·");
		case "tool_start": {
			const args = event.argsPreview ? ` ${theme.fg("muted", truncate(event.argsPreview))}` : "";
			return `${theme.fg("accent", "▶")} ${theme.bold(event.toolName)}${args}`;
		}
		case "tool_end": {
			const mark = event.isError ? theme.fg("error", "✗") : theme.fg("success", "✓");
			const preview = event.resultPreview ? ` ${theme.fg("muted", truncate(event.resultPreview))}` : "";
			return `${mark} ${event.toolName}${preview}`;
		}
		case "user_injected":
			return `${theme.fg("warning", "→")} ${theme.fg("text", truncate(event.text, 400))}`;
	}
}

/**
 * A Text whose content is recomputed on every render via the provided getter.
 * Lets the header reflect live status/duration without re-subscribing.
 */
class LiveText implements Component {
	private readonly getter: () => string;

	constructor(getter: () => string) {
		this.getter = getter;
	}
	render(width: number): string[] {
		// Reuse a Text instance per render for wrapping/padding semantics.
		return new Text(this.getter(), 1, 0).render(width);
	}
	invalidate(): void {
		// No cached state — nothing to invalidate.
	}
}

export class ZoomedTaskComponent extends Container {
	private readonly taskId: string;
	private readonly ui: TUI;
	private readonly sessionConfig: ZoomedSessionConfig | undefined;
	private unsubscribeMessages?: () => void;
	/** Number of `TaskMessageEvent`s already rendered into `eventsContainer`. */
	private renderedEventCount = 0;
	/** Whether a microtask render is already queued (coalesce notifications). */
	private renderQueued = false;
	private readonly eventsContainer = new Container();
	private placeholderShown = false;
	/** Live session transcript — used when a child AgentSession is available. */
	private sessionTranscript: ZoomedSessionTranscript | undefined = undefined;

	constructor(taskId: string, ui: TUI, sessionConfig?: ZoomedSessionConfig) {
		super();
		this.taskId = taskId;
		this.ui = ui;
		this.sessionConfig = sessionConfig;
		// Build the static scaffold once: header, divider, events container.
		this.addChild(new DynamicBorder());
		this.addChild(new LiveText(() => this.renderHeader()));
		this.addChild(new DynamicBorder());
		this.addChild(new Spacer(1));
		this.addChild(this.eventsContainer);
		this.addChild(new Spacer(1));

		// Use live session rendering when available; fall back to Phase 1 tail.
		const liveSession = getLiveSession(this.taskId);
		if (liveSession && this.sessionConfig) {
			this.sessionTranscript = new ZoomedSessionTranscript(liveSession, this.ui, this.sessionConfig);
			this.eventsContainer.addChild(this.sessionTranscript);
		} else {
			// Phase 1 fallback: append-only TaskMessageEvent tail.
			this.renderDeltaImmediate();
			this.unsubscribeMessages = subscribeTaskMessages(this.taskId, () => {
				this.scheduleRender();
			});
		}
	}

	dispose(): void {
		this.sessionTranscript?.dispose();
		this.sessionTranscript = undefined;
		this.unsubscribeMessages?.();
		this.unsubscribeMessages = undefined;
	}

	override invalidate(): void {
		// Don't full-rebuild on invalidate. Let normal render flow re-paint;
		// events are append-only and the header is a LiveText that recomputes.
		super.invalidate();
	}

	private scheduleRender(): void {
		if (this.renderQueued) return;
		this.renderQueued = true;
		queueMicrotask(() => {
			this.renderQueued = false;
			this.renderDeltaImmediate();
			// Critical: requestRender ourselves. The TUI doesn't auto-repaint
			// on Container child mutations — it only paints on input, spinner
			// tick, or explicit requests. Without this the new event sits in
			// the buffer until something unrelated triggers a paint.
			this.ui.requestRender();
		});
	}

	private renderDeltaImmediate(): void {
		const events = getTaskMessages(this.taskId);

		// First-time placeholder swap.
		if (events.length === 0 && !this.placeholderShown) {
			this.eventsContainer.clear();
			this.eventsContainer.addChild(new Text(theme.fg("muted", "(no events yet — waiting for child agent…)"), 1, 0));
			this.placeholderShown = true;
			this.renderedEventCount = 0;
			return;
		}
		if (events.length > 0 && this.placeholderShown) {
			this.eventsContainer.clear();
			this.placeholderShown = false;
			this.renderedEventCount = 0;
		}

		// Detect ring-buffer eviction (older events dropped from the head).
		// When this happens the indices shift; safest is a one-shot rebuild,
		// which only costs ≤200 children once per eviction.
		if (events.length < this.renderedEventCount) {
			this.eventsContainer.clear();
			this.renderedEventCount = 0;
		}

		// Append-only delta.
		for (let i = this.renderedEventCount; i < events.length; i++) {
			const event = events[i];
			if (event) this.eventsContainer.addChild(new Text(renderEvent(event), 1, 0));
		}
		this.renderedEventCount = events.length;
	}

	private renderHeader(): string {
		const run = findAgentRecentRun(this.taskId);
		if (!run) return theme.fg("muted", `Zoom: ${this.taskId} (no run found)`);
		const agents = run.agents.length > 0 ? run.agents.join(", ") : "agent";
		const duration = run.durationMs !== undefined ? formatAgentDurationMs(run.durationMs) : "running";
		const first = run.tasks[0] ?? "";
		const preview = first ? ` ${theme.fg("muted", truncate(first, 60))}` : "";
		return `${theme.fg("accent", theme.bold(`Zoom › ${run.id}`))} ${statusColor(run.status)} ${theme.fg("muted", duration)} ${agents}${preview}`;
	}
}
