import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	type ContextFile,
	createContextFileImportCache,
	expandContextFilesImports,
	extractContextFileImports,
	MAX_CONTEXT_IMPORT_DEPTH,
} from "../src/core/context-file-imports.js";

function file(path: string, content: string): ContextFile {
	return { path, content };
}

describe("context file @ imports", () => {
	let tempDir: string;
	let projectDir: string;
	let agentDir: string;
	let cleanupPaths: string[];

	beforeEach(() => {
		tempDir = join(process.cwd(), ".tmp-context-imports", `${Date.now()}-${Math.random().toString(36).slice(2)}`);
		projectDir = join(tempDir, "project");
		agentDir = join(tempDir, "agent");
		cleanupPaths = [tempDir];
		mkdirSync(projectDir, { recursive: true });
		mkdirSync(agentDir, { recursive: true });
	});

	afterEach(() => {
		for (const path of cleanupPaths) {
			rmSync(path, { recursive: true, force: true });
		}
	});

	function expand(rootContent: string, rootPath = join(projectDir, "AGENTS.md")) {
		return expandContextFilesImports([file(rootPath, rootContent)], {
			cwd: projectDir,
			agentDir,
			cache: createContextFileImportCache(),
		});
	}

	it("loads a basic bare relative import", () => {
		const child = join(projectDir, "child.md");
		writeFileSync(child, "child instructions");

		const result = expand("root\n@child.md");

		expect(result.contextFiles.map((f) => f.path)).toEqual([join(projectDir, "AGENTS.md"), child]);
		expect(result.contextFiles[1].content).toBe("child instructions");
		expect(result.contextFiles[1].parentPath).toBe(join(projectDir, "AGENTS.md"));
	});

	it("resolves ./ and ../ imports relative to the importing file", () => {
		const dir = join(projectDir, "docs");
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(projectDir, "shared.md"), "shared");
		writeFileSync(join(dir, "nested.md"), "nested @../shared.md");

		const result = expand("@./docs/nested.md");

		expect(result.contextFiles.map((f) => f.content)).toEqual([
			"@./docs/nested.md",
			"nested @../shared.md",
			"shared",
		]);
	});

	it("resolves home-relative imports", () => {
		const homeImport = join(homedir(), `.pi-context-import-${Date.now()}-${Math.random().toString(36).slice(2)}.md`);
		cleanupPaths.push(homeImport);
		writeFileSync(homeImport, "home import");

		const result = expand(`@~/${homeImport.slice(homedir().length + 1)}`);

		expect(result.contextFiles[1].path).toBe(homeImport);
		expect(result.contextFiles[1].content).toBe("home import");
	});

	it("resolves absolute imports", () => {
		const child = join(projectDir, "absolute.md");
		writeFileSync(child, "absolute");

		const result = expand(`@${child}`);

		expect(result.contextFiles[1].path).toBe(child);
	});

	it("strips fragments before resolving imports", () => {
		const child = join(projectDir, "fragment.md");
		writeFileSync(child, "fragment");

		const result = expand("@fragment.md#heading");

		expect(result.contextFiles[1].path).toBe(child);
	});

	it("unescapes escaped spaces in import paths", () => {
		const child = join(projectDir, "my file.md");
		writeFileSync(child, "space");

		const result = expand("@my\\ file.md");

		expect(result.contextFiles[1].path).toBe(child);
	});

	it("ignores imports inside fenced code blocks", () => {
		writeFileSync(join(projectDir, "ignored.md"), "ignored");
		const result = expand("```\n@ignored.md\n```");
		expect(result.contextFiles).toHaveLength(1);
	});

	it("ignores imports inside indented code blocks", () => {
		writeFileSync(join(projectDir, "ignored.md"), "ignored");
		const result = expand("    @ignored.md");
		expect(result.contextFiles).toHaveLength(1);
	});

	it("ignores imports inside inline code spans", () => {
		writeFileSync(join(projectDir, "ignored.md"), "ignored");
		const result = expand("Use `@ignored.md` literally");
		expect(result.contextFiles).toHaveLength(1);
	});

	it("ignores imports inside HTML comments", () => {
		writeFileSync(join(projectDir, "ignored.md"), "ignored");
		const result = expand("<!-- @ignored.md -->");
		expect(result.contextFiles).toHaveLength(1);
	});

	it("scans residue outside HTML comments", () => {
		writeFileSync(join(projectDir, "ignored.md"), "ignored");
		writeFileSync(join(projectDir, "real.md"), "real");
		const result = expand("<!-- @ignored.md --> @real.md");
		expect(result.contextFiles.map((f) => f.content)).toEqual(["<!-- @ignored.md --> @real.md", "real"]);
	});

	it("warns and skips unsupported file extensions", () => {
		const child = join(projectDir, "binary.png");
		writeFileSync(child, "not really png");

		const result = expand("@binary.png");

		expect(result.contextFiles).toHaveLength(1);
		expect(result.diagnostics[0].message).toContain("unsupported file extension");
	});

	it("warns and skips missing files", () => {
		const result = expand("@missing.md");
		expect(result.contextFiles).toHaveLength(1);
		expect(result.diagnostics[0].message).toContain("does not exist");
	});

	it("prevents duplicate imports and cycles", () => {
		writeFileSync(join(projectDir, "a.md"), "A @b.md");
		writeFileSync(join(projectDir, "b.md"), "B @a.md");

		const result = expand("@a.md\n@a.md");

		expect(result.contextFiles.map((f) => f.content)).toEqual(["@a.md\n@a.md", "A @b.md", "B @a.md"]);
		expect(result.diagnostics.some((d) => d.message.includes("duplicate or circular"))).toBe(true);
	});

	it("stops at the maximum include depth", () => {
		for (let i = 1; i <= MAX_CONTEXT_IMPORT_DEPTH + 1; i++) {
			writeFileSync(join(projectDir, `d${i}.md`), `depth ${i} @d${i + 1}.md`);
		}

		const result = expand("@d1.md");

		expect(result.contextFiles.map((f) => f.content)).toEqual([
			"@d1.md",
			"depth 1 @d2.md",
			"depth 2 @d3.md",
			"depth 3 @d4.md",
			"depth 4 @d5.md",
		]);
		expect(result.diagnostics[0].message).toContain("Maximum context import depth reached");
	});

	it("returns byte-identical content from cache when files are unchanged", () => {
		const cache = createContextFileImportCache();
		writeFileSync(join(projectDir, "cached.md"), "cached");
		const root = file(join(projectDir, "AGENTS.md"), "@cached.md");

		const first = expandContextFilesImports([root], { cwd: projectDir, agentDir, cache });
		const second = expandContextFilesImports([root], { cwd: projectDir, agentDir, cache });

		expect(JSON.stringify(second.contextFiles)).toBe(JSON.stringify(first.contextFiles));
	});

	it("invalidates cache when a dependency mtime or size changes", () => {
		const cache = createContextFileImportCache();
		const child = join(projectDir, "dep.md");
		writeFileSync(child, "old");
		const root = file(join(projectDir, "AGENTS.md"), "@dep.md");
		expandContextFilesImports([root], { cwd: projectDir, agentDir, cache });

		writeFileSync(child, "new content with different size");
		const second = expandContextFilesImports([root], { cwd: projectDir, agentDir, cache });

		expect(second.contextFiles[1].content).toBe("new content with different size");
	});

	it("expands multiple context files independently", () => {
		writeFileSync(join(projectDir, "one.md"), "one");
		writeFileSync(join(projectDir, "two.md"), "two");

		const result = expandContextFilesImports(
			[file(join(projectDir, "AGENTS.md"), "@one.md"), file(join(projectDir, "sub", "AGENTS.md"), "@../two.md")],
			{ cwd: projectDir, agentDir, cache: createContextFileImportCache() },
		);

		expect(result.contextFiles.map((f) => f.content)).toEqual(["@one.md", "one", "@../two.md", "two"]);
	});

	it("extracts only path-like @ references", () => {
		const imports = extractContextFileImports("email@example.com @ok.md @@no.md @#no", join(projectDir, "AGENTS.md"));
		expect(imports.map((i) => i.path)).toEqual([join(projectDir, "ok.md")]);
	});
});
