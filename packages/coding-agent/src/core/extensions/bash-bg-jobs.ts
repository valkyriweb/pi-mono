import {
	type BashBgJobStore,
	createBashBgJobStore,
	createBashOutputNativeToolDefinition,
	createKillShellToolDefinition,
} from "../tools/bash.ts";
import { addAction, load } from "./extension-hooks.ts";
import type { ExtensionAPI } from "./types.ts";

export const BASH_BG_JOBS_SERVICE_ID = "bash.bgJobs";

export function hookBashBackgroundJobs(pi: ExtensionAPI): void {
	const jobs = createBashBgJobStore();
	pi.harness.provide<BashBgJobStore>(BASH_BG_JOBS_SERVICE_ID, jobs, { scope: "process" });

	pi.registerTool(createBashOutputNativeToolDefinition({ jobs, alwaysLoad: true }));
	pi.registerTool(createKillShellToolDefinition({ jobs, alwaysLoad: true }));

	pi.onSessionDispose(() => {
		jobs.killAll();
	});
}

addAction(load, "bashBgJobs", hookBashBackgroundJobs);
