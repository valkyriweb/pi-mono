import { describe, expect, it, vi } from "vitest";
import { InteractiveMode } from "../src/modes/interactive/interactive-mode.ts";

type CompactionQueued = { text: string; mode: "steer" | "followUp" };

function recall(fakeMode: unknown): boolean {
	return (
		InteractiveMode.prototype as unknown as { recallQueuedMessageToEditor: () => boolean }
	).recallQueuedMessageToEditor.call(fakeMode);
}

function preInput(fakeMode: unknown, data: string): boolean {
	return (InteractiveMode.prototype as unknown as { handlePreInput: (data: string) => boolean }).handlePreInput.call(
		fakeMode,
		data,
	);
}

describe("interactive-mode queued-message recall (up arrow)", () => {
	function createFakeMode(options: {
		editorText?: string;
		compactionQueuedMessages?: CompactionQueued[];
		popResult?: { text: string; mode: "steer" | "followUp" } | null;
	}) {
		const setText = vi.fn();
		const updatePendingMessagesDisplay = vi.fn();
		const requestRender = vi.fn();
		const popLastQueuedMessage = vi.fn(() => options.popResult ?? null);
		const fakeMode = {
			editor: { getText: () => options.editorText ?? "", setText },
			compactionQueuedMessages: options.compactionQueuedMessages ?? [],
			session: { popLastQueuedMessage },
			updatePendingMessagesDisplay,
			ui: { requestRender },
		};
		return { fakeMode, setText, updatePendingMessagesDisplay, popLastQueuedMessage };
	}

	it("does nothing and falls through when the editor already has text", () => {
		const { fakeMode, setText, popLastQueuedMessage } = createFakeMode({
			editorText: "half typed",
			popResult: { text: "queued", mode: "followUp" },
		});

		expect(recall(fakeMode)).toBe(false);
		expect(setText).not.toHaveBeenCalled();
		expect(popLastQueuedMessage).not.toHaveBeenCalled();
	});

	it("returns false when there are no queued messages", () => {
		const { fakeMode, setText } = createFakeMode({ popResult: null });

		expect(recall(fakeMode)).toBe(false);
		expect(setText).not.toHaveBeenCalled();
	});

	it("recalls the latest compaction-queued message first and removes it from the queue", () => {
		const compactionQueuedMessages: CompactionQueued[] = [
			{ text: "older", mode: "followUp" },
			{ text: "newest", mode: "followUp" },
		];
		const { fakeMode, setText, updatePendingMessagesDisplay, popLastQueuedMessage } = createFakeMode({
			compactionQueuedMessages,
			popResult: { text: "session message", mode: "followUp" },
		});

		expect(recall(fakeMode)).toBe(true);
		expect(setText).toHaveBeenCalledWith("newest");
		expect(compactionQueuedMessages).toEqual([{ text: "older", mode: "followUp" }]);
		expect(updatePendingMessagesDisplay).toHaveBeenCalledTimes(1);
		// Session queue is untouched while compaction messages remain.
		expect(popLastQueuedMessage).not.toHaveBeenCalled();
	});

	it("recalls the latest session-queued message when no compaction messages remain", () => {
		const { fakeMode, setText, updatePendingMessagesDisplay, popLastQueuedMessage } = createFakeMode({
			popResult: { text: "recall me", mode: "followUp" },
		});

		expect(recall(fakeMode)).toBe(true);
		expect(popLastQueuedMessage).toHaveBeenCalledTimes(1);
		expect(setText).toHaveBeenCalledWith("recall me");
		expect(updatePendingMessagesDisplay).toHaveBeenCalledTimes(1);
	});
});

describe("interactive-mode handlePreInput composition", () => {
	function createFakeMode(options: {
		cursorUpData: string;
		popResult?: { text: string; mode: "steer" | "followUp" } | null;
	}) {
		const setText = vi.fn();
		const popLastQueuedMessage = vi.fn(() => options.popResult ?? null);
		const handleExtensionFooterNavInput = vi.fn(() => false);
		const fakeMode = {
			editor: { getText: () => "", setText },
			compactionQueuedMessages: [] as { text: string; mode: "steer" | "followUp" }[],
			session: { popLastQueuedMessage },
			updatePendingMessagesDisplay: vi.fn(),
			ui: { requestRender: vi.fn() },
			// Only the configured up-arrow byte sequence counts as cursorUp.
			keybindings: {
				matches: (data: string, action: string) =>
					action === "tui.editor.cursorUp" && data === options.cursorUpData,
			},
			handleExtensionFooterNavInput,
			// Bind the real recall method so the composition is exercised end-to-end.
			recallQueuedMessageToEditor: () =>
				(
					InteractiveMode.prototype as unknown as { recallQueuedMessageToEditor: () => boolean }
				).recallQueuedMessageToEditor.call(fakeMode),
		};
		return { fakeMode, setText, popLastQueuedMessage, handleExtensionFooterNavInput };
	}

	it("recalls a queued message on up-arrow and skips footer nav", () => {
		const { fakeMode, setText, handleExtensionFooterNavInput } = createFakeMode({
			cursorUpData: "\x1b[A",
			popResult: { text: "queued", mode: "followUp" },
		});

		expect(preInput(fakeMode, "\x1b[A")).toBe(true);
		expect(setText).toHaveBeenCalledWith("queued");
		expect(handleExtensionFooterNavInput).not.toHaveBeenCalled();
	});

	it("falls through to footer nav on up-arrow when nothing is queued", () => {
		const { fakeMode, setText, handleExtensionFooterNavInput } = createFakeMode({
			cursorUpData: "\x1b[A",
			popResult: null,
		});

		expect(preInput(fakeMode, "\x1b[A")).toBe(false);
		expect(setText).not.toHaveBeenCalled();
		expect(handleExtensionFooterNavInput).toHaveBeenCalledTimes(1);
	});

	it("never attempts recall for non-up-arrow keys", () => {
		const { fakeMode, popLastQueuedMessage, handleExtensionFooterNavInput } = createFakeMode({
			cursorUpData: "\x1b[A",
			popResult: { text: "queued", mode: "followUp" },
		});

		expect(preInput(fakeMode, "\r")).toBe(false);
		expect(popLastQueuedMessage).not.toHaveBeenCalled();
		expect(handleExtensionFooterNavInput).toHaveBeenCalledWith("\r");
	});
});
