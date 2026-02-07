/**
 * Public entry point for the milaidy package.
 *
 * Config types are the primary public API surface.
 * @module milaidy
 */

export * from "./config/types.js";
export { RESTART_EXIT_CODE, setRestartHandler, requestRestart } from "./runtime/restart.js";
export type { RestartHandler } from "./runtime/restart.js";
