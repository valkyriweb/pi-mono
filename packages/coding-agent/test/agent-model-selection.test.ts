import { registerFauxProvider } from "@earendil-works/pi-ai";
import { afterEach, describe, expect, test } from "vitest";
import { getBuiltinAgentDefinitions } from "../src/core/agents/definitions.js";
import { resolveAgentModel, resolveAgentThinking } from "../src/core/agents/executor.js";
import { AuthStorage } from "../src/core/auth-storage.js";
import { ModelRegistry } from "../src/core/model-registry.js";

const registrations: ReturnType<typeof registerFauxProvider>[] = [];

afterEach(() => {
	for (const registration of registrations.splice(0)) registration.unregister();
});

function createRegistry() {
	const faux = registerFauxProvider({
		provider: "anthropic",
		models: [
			{ id: "parent-model", name: "Parent", reasoning: true },
			{ id: "child-model", name: "Child", reasoning: true },
			{ id: "plain-model", name: "Plain", reasoning: false },
			// matches the anthropic entry in fastModelPerProvider so the `"fast"`
			// alias has something to resolve to in this faux registry.
			{ id: "claude-haiku-4-5", name: "Haiku", reasoning: true },
		],
	});
	registrations.push(faux);
	const auth = AuthStorage.inMemory();
	auth.setRuntimeApiKey(faux.getModel().provider, "faux-key");
	const registry = ModelRegistry.inMemory(auth);
	registry.registerProvider(faux.getModel().provider, {
		baseUrl: faux.getModel().baseUrl,
		apiKey: "faux-key",
		api: faux.api,
		models: faux.models.map((model) => ({
			id: model.id,
			name: model.name,
			api: model.api,
			reasoning: model.reasoning,
			input: model.input,
			cost: model.cost,
			contextWindow: model.contextWindow,
			maxTokens: model.maxTokens,
			baseUrl: model.baseUrl,
		})),
	});
	return { registry, parent: registry.getAvailable().find((model) => model.id === "parent-model") };
}

describe("agent model and thinking selection", () => {
	test("task model overrides parent and definition", () => {
		const { registry, parent } = createRegistry();
		const agent = { ...getBuiltinAgentDefinitions()[0], model: "parent-model" };
		const selected = resolveAgentModel({
			modelReference: "child-model",
			agent,
			parentModel: parent,
			modelRegistry: registry,
		});
		expect(selected?.id).toBe("child-model");
	});

	test("definition model applies when task/tool do not override", () => {
		const { registry, parent } = createRegistry();
		const agent = { ...getBuiltinAgentDefinitions()[0], model: "child-model" };
		const selected = resolveAgentModel({ agent, parentModel: parent, modelRegistry: registry });
		expect(selected?.id).toBe("child-model");
	});

	test('"fast" alias resolves to the parent provider mapped fast model', () => {
		const { registry, parent } = createRegistry();
		const agent = { ...getBuiltinAgentDefinitions()[0], model: "fast" };
		const selected = resolveAgentModel({ agent, parentModel: parent, modelRegistry: registry });
		expect(selected?.id).toBe("claude-haiku-4-5");
		expect(selected?.provider).toBe("anthropic");
	});

	test('"fast" alias falls back to parent when provider has no mapped fast model', () => {
		// Re-register faux under a provider name with no fastModelPerProvider entry.
		const faux = registerFauxProvider({
			provider: "opencode",
			models: [{ id: "parent-model", name: "Parent", reasoning: true }],
		});
		registrations.push(faux);
		const auth = AuthStorage.inMemory();
		auth.setRuntimeApiKey("opencode", "faux-key");
		const registry = ModelRegistry.inMemory(auth);
		registry.registerProvider("opencode", {
			baseUrl: faux.getModel().baseUrl,
			apiKey: "faux-key",
			api: faux.api,
			models: faux.models.map((model) => ({
				id: model.id,
				name: model.name,
				api: model.api,
				reasoning: model.reasoning,
				input: model.input,
				cost: model.cost,
				contextWindow: model.contextWindow,
				maxTokens: model.maxTokens,
				baseUrl: model.baseUrl,
			})),
		});
		const parent = registry.getAvailable().find((m) => m.id === "parent-model");
		const agent = { ...getBuiltinAgentDefinitions()[0], model: "fast" };
		const selected = resolveAgentModel({ agent, parentModel: parent, modelRegistry: registry });
		expect(selected?.id).toBe("parent-model");
	});

	test("invalid model errors", () => {
		const { registry, parent } = createRegistry();
		expect(() =>
			resolveAgentModel({
				modelReference: "missing-model",
				agent: getBuiltinAgentDefinitions()[0],
				parentModel: parent,
				modelRegistry: registry,
			}),
		).toThrow("Unknown or unavailable model");
	});

	test("thinking precedence clamps non-reasoning models", () => {
		const { registry } = createRegistry();
		const reasoningModel = registry.getAvailable().find((model) => model.id === "child-model");
		const plainModel = registry.getAvailable().find((model) => model.id === "plain-model");
		const agent = { ...getBuiltinAgentDefinitions()[0], thinking: "low" as const };
		expect(
			resolveAgentThinking({ taskThinking: "high", agent, parentThinkingLevel: "minimal", model: reasoningModel }),
		).toBe("high");
		expect(resolveAgentThinking({ agent, parentThinkingLevel: "minimal", model: plainModel })).toBe("off");
	});
});
