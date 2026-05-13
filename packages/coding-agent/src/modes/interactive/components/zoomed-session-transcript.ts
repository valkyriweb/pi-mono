/**
 * ZoomedSessionTranscript — live rendering of a child agent's transcript.
 *
 * Subscribes to a child `AgentSession`'s event stream and renders each message
 * using the same `AssistantMessageComponent` and `ToolExecutionComponent`
 * widgets as the parent session, so the zoomed view looks identical to a
 * normal pi session.
 *
 * Key correctness guarantee: streaming assistant text **mutates in place** via
 * `AssistantMessageComponent.updateContent()` — no new child is added per
 * chunk, so there are no duplicate-prefix lines.
 *
 * Falls back gracefully when the live session is unavailable (terminal task or
 * replay-only path): the caller should show the Phase 1 `TaskMessageEvent`
 * tail instead.
 */

import type { AssistantMessage } from "@earendil-works/pi-ai";
import { Container, type MarkdownTheme, Spacer, Text, type TUI } from "@earendil-works/pi-tui";
import type { AgentSession } from "../../../core/agent-session.js";
import { theme } from "../theme/theme.js";
import { AssistantMessageComponent } from "./assistant-message.js";
import { ToolExecutionComponent } from "./tool-execution.js";

export interface ZoomedSessionConfig {
	/** Worker directory for built-in tool definitions (edit diffs etc.). */
	cwd: string;
	/** Whether to collapse thinking blocks in the zoom view. */
	hideThinkingBlock?: boolean;
	/** Markdown theme passed through from the parent session's settings. */
	markdownTheme?: MarkdownTheme;
	/** Whether to render image outputs inside tool results. */
	showImages?: boolean;
	/** Width (in cells) for rendered images. */
	imageWidthCells?: number;
}

/**
 * Subscribes to a child AgentSession and renders its transcript using the same
 * components as the parent session. Calling `dispose()` unsubscribes.
 *
 * Returns `undefined` from the factory if no live session is available —
 * callers should fall back to the Phase 1 TaskMessageEvent tail.
 */
export class ZoomedSessionTranscript extends Container {
	private unsubscribeSession?: () => void;
	/** The currently-streaming AssistantMessageComponent (mutated in place). */
	private streamingComponent: AssistantMessageComponent | undefined = undefined;
	/** Active ToolExecutionComponents keyed by toolCallId. */
	private readonly pendingTools = new Map<string, ToolExecutionComponent>();
	private readonly ui: TUI;
	private readonly config: Required<ZoomedSessionConfig>;

	constructor(session: AgentSession, ui: TUI, config: ZoomedSessionConfig) {
		super();
		this.ui = ui;
		this.config = {
			cwd: config.cwd,
			hideThinkingBlock: config.hideThinkingBlock ?? false,
			markdownTheme: config.markdownTheme ?? ({} as MarkdownTheme),
			showImages: config.showImages ?? true,
			imageWidthCells: config.imageWidthCells ?? 60,
		};

		// Render any messages already in the transcript (pre-zoom history).
		this.renderHistory(session);

		this.unsubscribeSession = session.subscribe((event) => {
			switch (event.type) {
				case "message_start":
					if (event.message.role === "assistant") {
						// New streaming turn — create a fresh AssistantMessageComponent.
						this.streamingComponent = new AssistantMessageComponent(
							undefined,
							this.config.hideThinkingBlock,
							this.config.markdownTheme,
						);
						this.addChild(new Spacer(1));
						this.addChild(this.streamingComponent);
						this.streamingComponent.updateContent(event.message as AssistantMessage);
						this.ui.requestRender();
					}
					break;

				case "message_update":
					// Mutate the in-flight AssistantMessageComponent — no new child added.
					if (this.streamingComponent && event.message.role === "assistant") {
						this.streamingComponent.updateContent(event.message as AssistantMessage);
						for (const content of event.message.content) {
							if (content.type === "toolCall" && !this.pendingTools.has(content.id)) {
								const tool = this.makeToolComponent(content.name, content.id, content.arguments);
								this.addChild(tool);
								this.pendingTools.set(content.id, tool);
							} else {
								const tool = this.pendingTools.get(content.type === "toolCall" ? content.id : "");
								if (tool) tool.updateArgs((content as { arguments?: unknown }).arguments);
							}
						}
						this.ui.requestRender();
					}
					break;

				case "message_end":
					if (event.message.role === "assistant" && this.streamingComponent) {
						this.streamingComponent.updateContent(event.message as AssistantMessage);
						for (const [, tool] of this.pendingTools) tool.setArgsComplete();
						this.streamingComponent = undefined;
						this.ui.requestRender();
					}
					break;

				case "tool_execution_start": {
					let tool = this.pendingTools.get(event.toolCallId);
					if (!tool) {
						tool = this.makeToolComponent(event.toolName, event.toolCallId, event.args);
						this.addChild(tool);
						this.pendingTools.set(event.toolCallId, tool);
					}
					tool.markExecutionStarted();
					this.ui.requestRender();
					break;
				}

				case "tool_execution_end": {
					const tool = this.pendingTools.get(event.toolCallId);
					if (tool) {
						tool.updateResult(
							event.result as {
								content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
								isError: boolean;
							},
						);
						this.pendingTools.delete(event.toolCallId);
					}
					this.ui.requestRender();
					break;
				}

				default:
					break;
			}
		});
	}

	dispose(): void {
		this.unsubscribeSession?.();
		this.unsubscribeSession = undefined;
	}

	private makeToolComponent(name: string, id: string, args: unknown): ToolExecutionComponent {
		const comp = new ToolExecutionComponent(
			name,
			id,
			args,
			{
				showImages: this.config.showImages,
				imageWidthCells: this.config.imageWidthCells,
			},
			undefined, // no parent-session tool definitions in the zoom view
			this.ui,
			this.config.cwd,
		);
		return comp;
	}

	/**
	 * Render any messages already in the session transcript (pre-zoom history).
	 * These are static — no streaming, no pending tools.
	 */
	private renderHistory(session: AgentSession): void {
		const entries = session.sessionManager.getEntries();
		for (const entry of entries) {
			if (entry.type !== "message") continue;
			const msg = entry.message;
			if (msg.role === "assistant") {
				const comp = new AssistantMessageComponent(
					msg as AssistantMessage,
					this.config.hideThinkingBlock,
					this.config.markdownTheme,
				);
				this.addChild(new Spacer(1));
				this.addChild(comp);
			} else if (msg.role === "toolResult") {
				// Render completed tool results via a minimal Text line.
				const preview = Array.isArray(msg.content)
					? msg.content
							.map((c: { type: string; text?: string }) => (c.type === "text" ? (c.text ?? "") : ""))
							.join(" ")
							.slice(0, 200)
					: "";
				if (preview) {
					this.addChild(
						new Text(
							`${theme.fg("success", "✓")} ${theme.fg("muted", preview.replace(/\s+/g, " ").trim())}`,
							1,
							0,
						),
					);
				}
			}
		}
	}
}

/**
 * Convenience: returns a new `ZoomedSessionTranscript` if `session` is provided,
 * otherwise returns `undefined` for the caller to fall back to Phase 1 tail.
 */
export function makeZoomedSessionTranscript(
	session: AgentSession | undefined,
	ui: TUI,
	config: ZoomedSessionConfig,
): ZoomedSessionTranscript | undefined {
	if (!session) return undefined;
	return new ZoomedSessionTranscript(session, ui, config);
}
