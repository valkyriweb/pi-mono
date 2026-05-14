import { type Component, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import type { AgentSession } from "../../../core/agent-session.js";
import { formatAgentFooterStatus } from "../../../core/agents/status.js";
import type { ReadonlyFooterDataProvider } from "../../../core/footer-data-provider.js";
import { getRunningTasksSorted } from "../../../core/tasks/index.js";
import { theme } from "../theme/theme.js";

/**
 * Sanitize text for display in a single-line status.
 * Removes newlines, tabs, carriage returns, and other control characters.
 */
function sanitizeStatusText(text: string): string {
	// Replace newlines, tabs, carriage returns with space, then collapse multiple spaces
	return text
		.replace(/[\r\n\t]/g, " ")
		.replace(/ +/g, " ")
		.trim();
}

/**
 * Format token counts (similar to web-ui)
 */
function formatTokens(count: number): string {
	if (count < 1000) return count.toString();
	if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
	if (count < 1000000) return `${Math.round(count / 1000)}k`;
	if (count < 10000000) return `${(count / 1000000).toFixed(1)}M`;
	return `${Math.round(count / 1000000)}M`;
}

interface UsageTotals {
	totalInput: number;
	totalOutput: number;
	totalCacheRead: number;
	totalCacheWrite: number;
	totalCost: number;
}

/**
 * Footer component that shows pwd, token stats, and context usage.
 * Computes token/context stats from session, gets git branch and extension statuses from provider.
 */
export class FooterComponent implements Component {
	private autoCompactEnabled = true;
	private usageCacheKey = "";
	private usageCache: UsageTotals = {
		totalInput: 0,
		totalOutput: 0,
		totalCacheRead: 0,
		totalCacheWrite: 0,
		totalCost: 0,
	};

	/** Task id currently highlighted in footer nav mode, or undefined when inactive. */
	private footerSelectedTaskId: string | undefined = undefined;

	constructor(
		private session: AgentSession,
		private footerData: ReadonlyFooterDataProvider,
	) {}

	setFooterSelectedTaskId(id: string | undefined): void {
		this.footerSelectedTaskId = id;
	}

	setSession(session: AgentSession): void {
		this.session = session;
	}

	setAutoCompactEnabled(enabled: boolean): void {
		this.autoCompactEnabled = enabled;
	}

	/**
	 * No-op: git branch caching now handled by provider.
	 * Kept for compatibility with existing call sites in interactive-mode.
	 */
	invalidate(): void {
		// No-op: git branch is cached/invalidated by provider
	}

	/**
	 * Clean up resources.
	 * Git watcher cleanup now handled by provider.
	 */
	dispose(): void {
		// Git watcher cleanup handled by provider
	}

	/**
	 * Render the agent status line at the bottom of the footer.
	 *
	 * When footer-nav mode is active (`footerSelectedTaskId` is set), render a
	 * pill-per-running-task row so the user can see which agent is highlighted.
	 * Otherwise fall back to the plain `formatAgentFooterStatus()` summary.
	 */
	private renderAgentStatusLine(width: number): string | undefined {
		if (this.footerSelectedTaskId !== undefined) {
			const tasks = getRunningTasksSorted();
			if (tasks.length === 0) return undefined;
			const pills = tasks.map((t) => {
				const label = ` ${t.id} `;
				return t.id === this.footerSelectedTaskId
					? theme.fg("accent", theme.bold(`[${t.id}]`))
					: theme.fg("dim", label);
			});
			const hint = theme.fg("muted", " ↑↓ select · enter=zoom · esc=cancel");
			const row = pills.join("") + hint;
			return truncateToWidth(row, width, theme.fg("dim", "..."));
		}
		const agentStatus = formatAgentFooterStatus();
		if (!agentStatus) return undefined;
		return truncateToWidth(theme.fg("dim", sanitizeStatusText(agentStatus)), width, theme.fg("dim", "..."));
	}

	private getUsageTotals(): UsageTotals {
		const entries = this.session.sessionManager.getEntries();
		let lastUsage:
			| { input: number; output: number; cacheRead: number; cacheWrite: number; cost: { total: number } }
			| undefined;
		for (let i = entries.length - 1; i >= 0; i--) {
			const entry = entries[i];
			if (entry?.type === "message" && entry.message.role === "assistant") {
				lastUsage = entry.message.usage;
				break;
			}
		}
		const cacheKey = [
			entries.length,
			lastUsage?.input ?? 0,
			lastUsage?.output ?? 0,
			lastUsage?.cacheRead ?? 0,
			lastUsage?.cacheWrite ?? 0,
			lastUsage?.cost.total ?? 0,
		].join(":");

		if (cacheKey === this.usageCacheKey) {
			return this.usageCache;
		}

		const totals: UsageTotals = {
			totalInput: 0,
			totalOutput: 0,
			totalCacheRead: 0,
			totalCacheWrite: 0,
			totalCost: 0,
		};

		for (const entry of entries) {
			if (entry.type === "message" && entry.message.role === "assistant") {
				totals.totalInput += entry.message.usage.input;
				totals.totalOutput += entry.message.usage.output;
				totals.totalCacheRead += entry.message.usage.cacheRead;
				totals.totalCacheWrite += entry.message.usage.cacheWrite;
				totals.totalCost += entry.message.usage.cost.total;
			}
		}

		this.usageCacheKey = cacheKey;
		this.usageCache = totals;
		return totals;
	}

	render(width: number): string[] {
		const state = this.session.state;
		const { totalInput, totalOutput, totalCacheRead, totalCacheWrite, totalCost } = this.getUsageTotals();

		// Calculate context usage from session (handles compaction correctly).
		// After compaction, tokens are unknown until the next LLM response.
		const contextUsage = this.session.getContextUsage();
		const contextWindow = contextUsage?.contextWindow ?? state.model?.contextWindow ?? 0;
		const contextPercentValue = contextUsage?.percent ?? 0;
		const contextPercent = contextUsage?.percent !== null ? contextPercentValue.toFixed(1) : "?";
		const contextTokens = contextUsage?.tokens ?? null;

		// Replace home directory with ~
		let pwd = this.session.sessionManager.getCwd();
		const home = process.env.HOME || process.env.USERPROFILE;
		if (home && pwd.startsWith(home)) {
			pwd = `~${pwd.slice(home.length)}`;
		}

		// Add git branch if available
		const branch = this.footerData.getGitBranch();
		if (branch) {
			pwd = `${pwd} (${branch})`;
		}

		// Add session name if set
		const sessionName = this.session.sessionManager.getSessionName();
		if (sessionName) {
			pwd = `${pwd} • ${sessionName}`;
		}

		// Build stats line
		const statsParts = [];
		if (totalInput) statsParts.push(`↑${formatTokens(totalInput)}`);
		if (totalOutput) statsParts.push(`↓${formatTokens(totalOutput)}`);
		if (totalCacheRead) statsParts.push(`R${formatTokens(totalCacheRead)}`);
		if (totalCacheWrite) statsParts.push(`W${formatTokens(totalCacheWrite)}`);

		// Show cost with "(sub)" indicator if using OAuth subscription
		const usingSubscription = state.model ? this.session.modelRegistry.isUsingOAuth(state.model) : false;
		if (totalCost || usingSubscription) {
			const costStr = `$${totalCost.toFixed(3)}${usingSubscription ? " (sub)" : ""}`;
			statsParts.push(costStr);
		}

		// Colorize context percentage based on usage
		let contextPercentStr: string;
		const autoIndicator = this.autoCompactEnabled ? " (auto)" : "";
		const contextTokensDisplay = contextTokens === null ? "?" : formatTokens(contextTokens);
		const contextPercentDisplay =
			contextPercent === "?"
				? `? ${contextTokensDisplay}/${formatTokens(contextWindow)}${autoIndicator}`
				: `${contextPercent}% ${contextTokensDisplay}/${formatTokens(contextWindow)}${autoIndicator}`;
		if (contextPercentValue > 90) {
			contextPercentStr = theme.fg("error", contextPercentDisplay);
		} else if (contextPercentValue > 70) {
			contextPercentStr = theme.fg("warning", contextPercentDisplay);
		} else {
			contextPercentStr = contextPercentDisplay;
		}
		statsParts.push(contextPercentStr);

		let statsLeft = statsParts.join(" ");

		// Add model name on the right side, plus thinking level if model supports it
		const modelName = state.model?.id || "no-model";

		let statsLeftWidth = visibleWidth(statsLeft);

		// If statsLeft is too wide, truncate it
		if (statsLeftWidth > width) {
			statsLeft = truncateToWidth(statsLeft, width, "...");
			statsLeftWidth = visibleWidth(statsLeft);
		}

		// Calculate available space for padding (minimum 2 spaces between stats and model)
		const minPadding = 2;

		// Add thinking level indicator if model supports reasoning
		let rightSideWithoutProvider = modelName;
		if (state.model?.reasoning) {
			const thinkingLevel = state.thinkingLevel || "off";
			rightSideWithoutProvider =
				thinkingLevel === "off" ? `${modelName} • thinking off` : `${modelName} • ${thinkingLevel}`;
		}

		// Prepend the provider in parentheses if there are multiple providers and there's enough room
		let rightSide = rightSideWithoutProvider;
		if (this.footerData.getAvailableProviderCount() > 1 && state.model) {
			rightSide = `(${state.model!.provider}) ${rightSideWithoutProvider}`;
			if (statsLeftWidth + minPadding + visibleWidth(rightSide) > width) {
				// Too wide, fall back
				rightSide = rightSideWithoutProvider;
			}
		}

		const rightSideWidth = visibleWidth(rightSide);
		const totalNeeded = statsLeftWidth + minPadding + rightSideWidth;

		let statsLine: string;
		if (totalNeeded <= width) {
			// Both fit - add padding to right-align model
			const padding = " ".repeat(width - statsLeftWidth - rightSideWidth);
			statsLine = statsLeft + padding + rightSide;
		} else {
			// Need to truncate right side
			const availableForRight = width - statsLeftWidth - minPadding;
			if (availableForRight > 0) {
				const truncatedRight = truncateToWidth(rightSide, availableForRight, "");
				const truncatedRightWidth = visibleWidth(truncatedRight);
				const padding = " ".repeat(Math.max(0, width - statsLeftWidth - truncatedRightWidth));
				statsLine = statsLeft + padding + truncatedRight;
			} else {
				// Not enough space for right side at all
				statsLine = statsLeft;
			}
		}

		// Apply dim to each part separately. statsLeft may contain color codes (for context %)
		// that end with a reset, which would clear an outer dim wrapper. So we dim the parts
		// before and after the colored section independently.
		const dimStatsLeft = theme.fg("dim", statsLeft);
		const remainder = statsLine.slice(statsLeft.length); // padding + rightSide
		const dimRemainder = theme.fg("dim", remainder);

		const pwdLine = truncateToWidth(theme.fg("dim", pwd), width, theme.fg("dim", "..."));
		const lines = [pwdLine, dimStatsLeft + dimRemainder];

		const agentStatusLine = this.renderAgentStatusLine(width);
		if (agentStatusLine) {
			lines.push(agentStatusLine);
		}

		// Add extension statuses on a single line, sorted by key alphabetically
		const extensionStatuses = this.footerData.getExtensionStatuses();
		if (extensionStatuses.size > 0) {
			const sortedStatuses = Array.from(extensionStatuses.entries())
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([, text]) => sanitizeStatusText(text));
			const statusLine = sortedStatuses.join(" ");
			// Truncate to terminal width with dim ellipsis for consistency with footer style
			lines.push(truncateToWidth(statusLine, width, theme.fg("dim", "...")));
		}

		return lines;
	}
}
