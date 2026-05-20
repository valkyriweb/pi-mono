/**
 * ZoomedBashComponent — main-pane view for a backgrounded bash job.
 *
 * Renders a live-ish tail of the job log persisted by the bash tool under
 * ~/.pi/agent/bash-bg. The component polls while the job is running because
 * background bash output is file-backed rather than event-buffered like agents.
 */

import { readFileSync, statSync } from "node:fs";
import { type Component, Container, Spacer, Text, type TUI } from "@earendil-works/pi-tui";
import { type BashBgJob, getBashBgJob } from "../../../core/tools/bash.js";
import { theme } from "../theme/theme.js";
import { DynamicBorder } from "./dynamic-border.js";

const MAX_LINES = 200;
const REFRESH_MS = 1000;

function formatDuration(ms: number): string {
	const seconds = Math.max(0, Math.floor(ms / 1000));
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	const remainder = seconds % 60;
	return `${minutes}m${remainder.toString().padStart(2, "0")}s`;
}

function truncate(text: string, max = 100): string {
	const single = text.replace(/\s+/g, " ").trim();
	return single.length > max ? `${single.slice(0, max - 1)}…` : single;
}

function statusColor(job: BashBgJob): string {
	switch (job.status) {
		case "running":
			return theme.fg("accent", "running");
		case "exited":
			return job.exitCode === 0 ? theme.fg("success", "exited") : theme.fg("error", `exit ${job.exitCode}`);
		case "killed":
			return theme.fg("warning", "killed");
		case "failed":
			return theme.fg("error", "failed");
	}
}

class LiveText implements Component {
	private readonly getter: () => string;

	constructor(getter: () => string) {
		this.getter = getter;
	}
	render(width: number): string[] {
		return new Text(this.getter(), 1, 0).render(width);
	}
	invalidate(): void {}
}

class LogTail implements Component {
	private readonly getJob: () => BashBgJob | undefined;
	private cachedWidth: number | undefined;
	private cachedMtimeMs: number | undefined;
	private cachedSize: number | undefined;
	private cachedLines: string[] | undefined;

	constructor(getJob: () => BashBgJob | undefined) {
		this.getJob = getJob;
	}

	render(width: number): string[] {
		const job = this.getJob();
		if (!job) return new Text(theme.fg("muted", "Background bash job not found."), 1, 0).render(width);

		let mtimeMs = 0;
		let size = 0;
		try {
			const stat = statSync(job.logPath);
			mtimeMs = stat.mtimeMs;
			size = stat.size;
		} catch {
			return new Text(theme.fg("muted", "(no log output yet)"), 1, 0).render(width);
		}

		if (
			this.cachedLines === undefined ||
			this.cachedWidth !== width ||
			this.cachedMtimeMs !== mtimeMs ||
			this.cachedSize !== size
		) {
			let content = "";
			try {
				content = readFileSync(job.logPath, "utf8");
			} catch {
				content = "";
			}
			const allLines = content.split("\n");
			if (allLines.length > 0 && allLines[allLines.length - 1] === "") allLines.pop();
			const tail = allLines.slice(-MAX_LINES);
			const hidden = allLines.length - tail.length;
			const text =
				tail.length > 0
					? tail.map((line) => theme.fg("muted", line)).join("\n")
					: theme.fg("muted", "(no output yet)");
			const prefix = hidden > 0 ? theme.fg("dim", `… ${hidden} earlier lines\n`) : "";
			this.cachedLines = new Text(prefix + text, 1, 0).render(width);
			this.cachedWidth = width;
			this.cachedMtimeMs = mtimeMs;
			this.cachedSize = size;
		}

		return this.cachedLines;
	}

	invalidate(): void {
		this.cachedWidth = undefined;
		this.cachedLines = undefined;
		this.cachedMtimeMs = undefined;
		this.cachedSize = undefined;
	}
}

export class ZoomedBashComponent extends Container {
	private readonly bgId: string;
	private readonly ui: TUI;
	private refreshTimer: ReturnType<typeof setInterval> | undefined;

	constructor(bgId: string, ui: TUI) {
		super();
		this.bgId = bgId;
		this.ui = ui;
		this.addChild(new DynamicBorder((s: string) => theme.fg("bashMode", s)));
		this.addChild(new LiveText(() => this.renderHeader()));
		this.addChild(new DynamicBorder((s: string) => theme.fg("bashMode", s)));
		this.addChild(new Spacer(1));
		this.addChild(new LogTail(() => getBashBgJob(this.bgId)));
		this.addChild(new Spacer(1));

		const job = getBashBgJob(this.bgId);
		if (job?.status === "running") {
			this.refreshTimer = setInterval(() => {
				const current = getBashBgJob(this.bgId);
				this.invalidate();
				this.ui.requestRender();
				if (!current || current.status !== "running") this.dispose();
			}, REFRESH_MS);
		}
	}

	dispose(): void {
		if (this.refreshTimer) {
			clearInterval(this.refreshTimer);
			this.refreshTimer = undefined;
		}
	}

	private renderHeader(): string {
		const job = getBashBgJob(this.bgId);
		if (!job) return theme.fg("muted", `Shell › ${this.bgId} (not found)`);
		const elapsed = formatDuration((job.endedAt ?? Date.now()) - job.startedAt);
		const outputHint = theme.fg("dim", ` log ${job.logPath}`);
		return `${theme.fg("bashMode", theme.bold(`Shell › ${job.id}`))} ${statusColor(job)} ${theme.fg("muted", elapsed)} ${truncate(job.command, 80)}${outputHint}`;
	}
}
