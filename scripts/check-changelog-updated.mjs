#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const DEFAULT_BASE_REF = process.env.CHANGELOG_BASE_REF ?? "origin/main";
const diffRange = process.argv[2] ?? `${DEFAULT_BASE_REF}...HEAD`;

function git(args) {
	return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function changedFiles() {
	return git(["diff", "--name-only", diffRange])
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
}

function isChangelog(path) {
	return path === "FORK-CHANGELOG.md" || /(^|\/)CHANGELOG\.md$/.test(path);
}

function isDocsOnly(path) {
	return path.startsWith("docs/") || path.endsWith(".md") || path.endsWith(".mdx");
}

function isTestOnly(path) {
	return /(^|\/)(test|tests|__tests__|fixtures)\//.test(path) || /\.(spec|test)\.[cm]?[jt]sx?$/.test(path);
}

function isIgnored(path) {
	return (
		isChangelog(path) ||
		isDocsOnly(path) ||
		isTestOnly(path) ||
		path.startsWith(".github/") ||
		path === "package-lock.json" ||
		path === "npm-shrinkwrap.json"
	);
}

function requiredChangelog(path) {
	if (isIgnored(path)) return undefined;
	const packageMatch = /^packages\/([^/]+)\//.exec(path);
	if (packageMatch) return `packages/${packageMatch[1]}/CHANGELOG.md`;
	return "FORK-CHANGELOG.md";
}

const files = changedFiles();
const changed = new Set(files);
const required = new Set(files.map(requiredChangelog).filter(Boolean));
const missing = [...required].filter((path) => !changed.has(path));

if (missing.length === 0) {
	console.log("Changelog check passed.");
	process.exit(0);
}

console.error("Changelog check failed.");
console.error("");
console.error(`Diff range: ${diffRange}`);
console.error("");
console.error("Update the changelog file that matches the changed surface:");
for (const path of missing) {
	console.error(`  - ${path}`);
}
console.error("");
console.error("Docs-only, tests-only, workflow-only, and lockfile-only changes are ignored.");
process.exit(1);
