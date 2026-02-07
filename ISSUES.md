
## Model Provider Priority / Multi-Provider Support

**Date:** 2026-02-07
**Status:** Open

When multiple model provider plugins are loaded (e.g. both `ZAI_API_KEY` and `ANTHROPIC_API_KEY` are set), they compete for the same model type slots (`TEXT_SMALL`, `TEXT_LARGE`, `OBJECT_SMALL`, `OBJECT_LARGE`). Last-loaded plugin wins, with no user control over priority.

**Current behavior:** Plugin load order determines which provider handles each model type. z.ai loads after Anthropic in the provider map, so it silently takes over.

**Desired behavior:** Users should be able to:
- Explicitly set provider priority per model type (e.g. use z.ai for TEXT_LARGE but Anthropic for TEXT_SMALL)
- Configure a primary/fallback chain (e.g. try z.ai first, fall back to Anthropic on failure)
- See which provider is actually handling each model type (e.g. `milaidy models` shows active bindings)

**Affected files:** `src/eliza.ts` (plugin loading order in `collectPluginNames` / `resolvePlugins`)

**Workaround:** Only set one provider's API key at a time.
