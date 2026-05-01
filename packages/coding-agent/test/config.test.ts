import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { delimiter, join } from "path";
import { afterEach, describe, expect, test } from "vitest";
import {
	detectInstallMethod,
	getSelfUpdateCommand,
	getSelfUpdateUnavailableInstruction,
	getUpdateInstruction,
} from "../src/config.js";

const execPathDescriptor = Object.getOwnPropertyDescriptor(process, "execPath");
const originalPath = process.env.PATH;
const originalPiPackageDir = process.env.PI_PACKAGE_DIR;
const originalPiSourceUpdateCommand = process.env.PI_SOURCE_UPDATE_COMMAND;
let tempDir: string | undefined;

function setExecPath(value: string): void {
	Object.defineProperty(process, "execPath", {
		value,
		configurable: true,
	});
}

afterEach(() => {
	if (execPathDescriptor) {
		Object.defineProperty(process, "execPath", execPathDescriptor);
	}
	if (originalPath === undefined) {
		delete process.env.PATH;
	} else {
		process.env.PATH = originalPath;
	}
	if (originalPiPackageDir === undefined) {
		delete process.env.PI_PACKAGE_DIR;
	} else {
		process.env.PI_PACKAGE_DIR = originalPiPackageDir;
	}
	if (originalPiSourceUpdateCommand === undefined) {
		delete process.env.PI_SOURCE_UPDATE_COMMAND;
	} else {
		process.env.PI_SOURCE_UPDATE_COMMAND = originalPiSourceUpdateCommand;
	}
	if (tempDir) {
		chmodSync(tempDir, 0o700);
		rmSync(tempDir, { recursive: true, force: true });
		tempDir = undefined;
	}
});

function createNpmPrefixInstall(template = "pi-prefix-"): { prefix: string; packageDir: string } {
	const prefix = mkdtempSync(join(tmpdir(), template));
	const root = join(prefix, "lib", "node_modules");
	const scopeDir = join(root, "@mariozechner");
	const packageDir = join(scopeDir, "pi-coding-agent");
	mkdirSync(packageDir, { recursive: true });
	tempDir = prefix;
	process.env.PI_PACKAGE_DIR = packageDir;
	setExecPath(join(packageDir, "dist", "cli.js"));
	return { prefix, packageDir };
}

function createBunGlobalInstall(): { packageDir: string } {
	const temp = mkdtempSync(join(tmpdir(), "pi-bun-"));
	const prefix = join(temp, ".bun");
	const bunBin = join(prefix, "bin");
	const root = join(prefix, "install", "global", "node_modules");
	const scopeDir = join(root, "@mariozechner");
	const packageDir = join(scopeDir, "pi-coding-agent");
	mkdirSync(packageDir, { recursive: true });
	mkdirSync(bunBin, { recursive: true });
	writeFileSync(join(bunBin, process.platform === "win32" ? "bun.cmd" : "bun"), createFakeBunScript(bunBin));
	chmodSync(join(bunBin, process.platform === "win32" ? "bun.cmd" : "bun"), 0o755);
	tempDir = temp;
	process.env.PATH = `${bunBin}${delimiter}${originalPath ?? ""}`;
	process.env.PI_PACKAGE_DIR = packageDir;
	setExecPath(join(packageDir, "dist", "cli.js"));
	return { packageDir };
}

function createSourceCheckout(): { root: string; packageDir: string } {
	const root = mkdtempSync(join(tmpdir(), "pi-source-"));
	const packageDir = join(root, "packages", "coding-agent");
	mkdirSync(join(root, ".git"), { recursive: true });
	mkdirSync(packageDir, { recursive: true });
	writeFileSync(join(packageDir, "package.json"), JSON.stringify({ name: "@mariozechner/pi-coding-agent" }));
	tempDir = root;
	process.env.PI_PACKAGE_DIR = packageDir;
	setExecPath(join(packageDir, "dist", "cli.js"));
	return { root, packageDir };
}

function createFakeBunScript(bunBin: string): string {
	if (process.platform === "win32") {
		return `@echo off\r\nif "%1"=="pm" if "%2"=="bin" if "%3"=="-g" echo ${bunBin}\r\n`;
	}
	const escapedBunBin = bunBin.replaceAll("'", "'\\''");
	return `#!/bin/sh\nif [ "$1" = "pm" ] && [ "$2" = "bin" ] && [ "$3" = "-g" ]; then\n\tprintf '%s\\n' '${escapedBunBin}'\n\texit 0\nfi\nexit 1\n`;
}

describe("detectInstallMethod", () => {
	test("detects pnpm from Windows .pnpm install paths", () => {
		setExecPath(
			"C:\\Users\\Admin\\Documents\\pnpm-repository\\global\\5\\.pnpm\\@mariozechner+pi-coding-agent@0.67.68\\node_modules\\@mariozechner\\pi-coding-agent\\dist\\cli.js",
		);

		expect(detectInstallMethod()).toBe("pnpm");
		expect(getUpdateInstruction("@mariozechner/pi-coding-agent")).toBe(
			"Run: pnpm install -g @mariozechner/pi-coding-agent",
		);
	});

	test("does not self-update unknown wrapper installs", () => {
		const packageDir = mkdtempSync(join(tmpdir(), "pi-unknown-"));
		tempDir = packageDir;
		process.env.PI_PACKAGE_DIR = packageDir;
		setExecPath("/usr/local/bin/node");

		expect(detectInstallMethod()).toBe("unknown");
		expect(getSelfUpdateCommand("@mariozechner/pi-coding-agent")).toBeUndefined();
		expect(getUpdateInstruction("@mariozechner/pi-coding-agent")).toBe(
			"Update @mariozechner/pi-coding-agent using the package manager, wrapper, or source checkout that provides this installation.",
		);
	});

	test("self-updates source checkout installs from configured command", () => {
		createSourceCheckout();

		const command = getSelfUpdateCommand("@mariozechner/pi-coding-agent", undefined, [
			"/Users/luke/Projects/personal/rusty/scripts/update-pi",
		]);

		expect(detectInstallMethod()).toBe("source-checkout");
		expect(command).toEqual({
			command: "/Users/luke/Projects/personal/rusty/scripts/update-pi",
			args: [],
			display: "/Users/luke/Projects/personal/rusty/scripts/update-pi",
		});
	});

	test("self-updates source checkout installs from env command", () => {
		createSourceCheckout();
		process.env.PI_SOURCE_UPDATE_COMMAND = "~/Projects/personal/rusty/scripts/update-pi";

		const command = getSelfUpdateCommand("@mariozechner/pi-coding-agent");

		expect(command?.display).toBe("~/Projects/personal/rusty/scripts/update-pi");
		expect(command?.args.at(-1)).toBe("~/Projects/personal/rusty/scripts/update-pi");
	});

	test("source checkout unavailable instruction mentions source update config", () => {
		createSourceCheckout();

		expect(getSelfUpdateCommand("@mariozechner/pi-coding-agent")).toBeUndefined();
		expect(getSelfUpdateUnavailableInstruction("@mariozechner/pi-coding-agent")).toContain(
			"Configure a source update command with PI_SOURCE_UPDATE_COMMAND or settings.sourceUpdateCommand",
		);
	});

	test("self-updates npm installs from custom prefixes", () => {
		const { prefix } = createNpmPrefixInstall();

		const command = getSelfUpdateCommand("@mariozechner/pi-coding-agent");

		expect(detectInstallMethod()).toBe("npm");
		expect(command).toEqual({
			command: "npm",
			args: ["--prefix", prefix, "install", "-g", "@mariozechner/pi-coding-agent"],
			display: `npm --prefix ${prefix} install -g @mariozechner/pi-coding-agent`,
		});
	});

	test("self-update respects configured npmCommand", () => {
		const { prefix } = createNpmPrefixInstall();

		const command = getSelfUpdateCommand("@mariozechner/pi-coding-agent", ["npm", "--prefix", prefix]);

		expect(command).toEqual({
			command: "npm",
			args: ["--prefix", prefix, "install", "-g", "@mariozechner/pi-coding-agent"],
			display: `npm --prefix ${prefix} install -g @mariozechner/pi-coding-agent`,
		});
	});

	test("self-update treats empty npmCommand as unset", () => {
		const { prefix } = createNpmPrefixInstall();

		const command = getSelfUpdateCommand("@mariozechner/pi-coding-agent", []);

		expect(command?.args).toEqual(["--prefix", prefix, "install", "-g", "@mariozechner/pi-coding-agent"]);
	});

	test("quotes npm self-update display paths", () => {
		const { prefix } = createNpmPrefixInstall("pi prefix ");

		const command = getSelfUpdateCommand("@mariozechner/pi-coding-agent");

		expect(command?.display).toBe(`npm --prefix "${prefix}" install -g @mariozechner/pi-coding-agent`);
	});

	test("does not infer Windows npm custom prefixes from package paths", () => {
		const packageDir = "C:\\Users\\Admin\\npm prefix\\node_modules\\@mariozechner\\pi-coding-agent";
		process.env.PI_PACKAGE_DIR = packageDir;
		setExecPath(`${packageDir}\\dist\\cli.js`);

		expect(detectInstallMethod()).toBe("npm");
		expect(getUpdateInstruction("@mariozechner/pi-coding-agent")).toBe(
			"Run: npm install -g @mariozechner/pi-coding-agent",
		);
	});

	test("self-updates bun global installs from bun pm bin", () => {
		createBunGlobalInstall();

		const command = getSelfUpdateCommand("@mariozechner/pi-coding-agent");

		expect(detectInstallMethod()).toBe("bun");
		expect(command).toEqual({
			command: "bun",
			args: ["install", "-g", "@mariozechner/pi-coding-agent"],
			display: "bun install -g @mariozechner/pi-coding-agent",
		});
	});

	test("does not self-update when npm install path is not writable", () => {
		const { packageDir } = createNpmPrefixInstall();
		chmodSync(packageDir, 0o500);

		expect(getSelfUpdateCommand("@mariozechner/pi-coding-agent")).toBeUndefined();
		expect(getSelfUpdateUnavailableInstruction("@mariozechner/pi-coding-agent")).toContain(
			"the install path is not writable",
		);
	});
});
