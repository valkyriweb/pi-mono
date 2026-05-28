import type { ExtensionFactory } from "./types.ts";

export const load = "load";

export interface Hook {
	name: string;
	description?: string;
}

export interface Action {
	hook: string;
	id: string;
	callback: ExtensionFactory;
	priority: number;
	order: number;
}

export type FilterCallback<T = unknown> = (value: T, ...args: unknown[]) => T | Promise<T>;

export interface Filter<T = unknown> {
	hook: string;
	id: string;
	callback: FilterCallback<T>;
	priority: number;
	order: number;
}

const DEFAULT_PRIORITY = 10;
const hooks = new Map<string, Hook>();
const actions = new Map<string, Action[]>();
const filters = new Map<string, Filter[]>();
let nextActionOrder = 0;
let nextFilterOrder = 0;

export function registerHook(name: string, options?: { description?: string }): Hook {
	const existing = hooks.get(name);
	if (existing) return existing;
	const hook = { name, description: options?.description };
	hooks.set(name, hook);
	return hook;
}

export function removeHook(name: string): void {
	hooks.delete(name);
	actions.delete(name);
	filters.delete(name);
}

export function hasHook(name: string): boolean {
	return hooks.has(name);
}

export function addAction(
	hook: string,
	id: string,
	callback: ExtensionFactory,
	options?: { priority?: number },
): () => void {
	if (!hasHook(hook)) registerHook(hook);
	const action = {
		hook,
		id,
		callback,
		priority: options?.priority ?? DEFAULT_PRIORITY,
		order: nextActionOrder++,
	};
	const hookActions = actions.get(hook) ?? [];
	const existingIndex = hookActions.findIndex((candidate) => candidate.id === id);
	if (existingIndex === -1) {
		hookActions.push(action);
	} else {
		hookActions[existingIndex] = action;
	}
	actions.set(hook, sortActions(hookActions));
	return () => removeAction(hook, id);
}

export function removeAction(hook: string, id: string): void {
	const hookActions = actions.get(hook);
	if (!hookActions) return;
	const next = hookActions.filter((action) => action.id !== id);
	if (next.length === 0) {
		actions.delete(hook);
		return;
	}
	actions.set(hook, next);
}

export function getActions(hook: string): Action[] {
	return [...(actions.get(hook) ?? [])];
}

export function addFilter<T = unknown>(
	hook: string,
	id: string,
	callback: FilterCallback<T>,
	options?: { priority?: number },
): () => void {
	// CACHE CRITICAL: filter ids, priorities, and registration order affect
	// cache-bearing seams such as systemPrompt:build, provider:beforeRequest,
	// and message:end. Keep registrations deterministic across turns.
	if (!hasHook(hook)) registerHook(hook);
	const filter: Filter = {
		hook,
		id,
		callback: callback as FilterCallback,
		priority: options?.priority ?? DEFAULT_PRIORITY,
		order: nextFilterOrder++,
	};
	const hookFilters = filters.get(hook) ?? [];
	const existingIndex = hookFilters.findIndex((candidate) => candidate.id === id);
	if (existingIndex === -1) {
		hookFilters.push(filter);
	} else {
		hookFilters[existingIndex] = filter;
	}
	filters.set(hook, sortFilters(hookFilters));
	return () => removeFilter(hook, id);
}

export function removeFilter(hook: string, id: string): void {
	const hookFilters = filters.get(hook);
	if (!hookFilters) return;
	const next = hookFilters.filter((filter) => filter.id !== id);
	if (next.length === 0) {
		filters.delete(hook);
		return;
	}
	filters.set(hook, next);
}

export function getFilters(hook: string): Filter[] {
	return [...(filters.get(hook) ?? [])];
}

export async function applyFilters<T>(hook: string, value: T, ...args: unknown[]): Promise<T> {
	let current = value;
	for (const filter of getFilters(hook)) {
		current = await (filter.callback as FilterCallback<T>)(current, ...args);
	}
	return current;
}

export function actionSource(action: Action): string {
	// `<builtin:hook:...>` makes SourceInfo.source resolve to "builtin" via
	// createExtension's synthetic-path parser, so noTools:"builtin" and default
	// activation rules still treat these action-registered tools as built-ins.
	return `<builtin:hook:${action.hook}:${action.id}>`;
}

export function isHookPath(extensionPath: string): boolean {
	return extensionPath.startsWith("<builtin:hook:");
}

function sortActions(hookActions: Action[]): Action[] {
	return [...hookActions].sort((left, right) => left.priority - right.priority || left.order - right.order);
}

function sortFilters(hookFilters: Filter[]): Filter[] {
	return [...hookFilters].sort((left, right) => left.priority - right.priority || left.order - right.order);
}

registerHook(load, {
	description: "Attach Pi's default extension behavior before sessions start.",
});
