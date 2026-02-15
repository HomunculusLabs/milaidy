# Implementation Plan: Knowledge CTX + Pi-AI Integration

**Goal:** Streamline contextual knowledge enrichment (CTX) setup so Milaidy users get cloud-quality RAG enrichment with local embeddings — zero extra env vars, leveraging existing pi-ai credentials.

**Context:** Plugin-knowledge supports CTX enrichment (LLM rewrites chunks with surrounding context before embedding). Currently it requires manual `TEXT_PROVIDER`/`TEXT_MODEL`/API key env vars. But when `useCustomLLM=false`, it falls through to `runtime.useModel(ModelType.TEXT_LARGE)` — which pi-ai already handles. We just need config, onboarding, and TUI wiring.

---

## Task 1: Add `knowledge` section to MilaidyConfig type

**File:** `src/config/types.milaidy.ts`

- [x] Add `KnowledgeConfig` type:
  ```typescript
  export type KnowledgeConfig = {
    /** Enable contextual chunk enrichment via cloud LLM before embedding (default: false). */
    contextualEnrichment?: boolean;
    /** Auto-load documents from docsPath on agent startup (default: true). */
    loadDocsOnStartup?: boolean;
    /** Directory to scan for knowledge documents (default: "./docs"). */
    docsPath?: string;
  };
  ```
- [x] Add `knowledge?: KnowledgeConfig` field to `MilaidyConfig` (near the `embedding` field)

**Acceptance:** Type-check passes (`bun run build`), no runtime changes yet.

---

## Task 2: Add config schema labels and descriptions

**File:** `src/config/schema.ts`

- [x] Add display labels and descriptions for the new `knowledge.*` keys to the schema label/description maps:
  - `knowledge` → "Knowledge & RAG"
  - `knowledge.contextualEnrichment` → "Contextual Enrichment" / description about cloud LLM chunk enrichment
  - `knowledge.loadDocsOnStartup` → "Load Docs on Startup"
  - `knowledge.docsPath` → "Documents Path"
- [x] Follow existing patterns in the file (see `embedding.*` entries near line 720 for reference)

**Acceptance:** Labels render correctly in config display surfaces.

---

## Task 3: Forward knowledge config as runtime settings

**File:** `src/runtime/eliza.ts`

- [x] In the `settings:` block where runtime settings are forwarded (around line 2145), add forwarding for knowledge config:
  ```typescript
  ...(config.knowledge?.contextualEnrichment
    ? { CTX_KNOWLEDGE_ENABLED: "true" }
    : {}),
  ...(config.knowledge?.loadDocsOnStartup === false
    ? { LOAD_DOCS_ON_STARTUP: "false" }
    : {}),
  ...(config.knowledge?.docsPath
    ? { KNOWLEDGE_PATH: config.knowledge.docsPath }
    : {}),
  ```
- [x] Ensure these settings are also forwarded in the headless/GUI agent creation path (check for a second `settings:` block around line 2606+ where `registerPiAiRuntime` is called for new agents)

**Acceptance:** When `knowledge.contextualEnrichment: true` is set in `milaidy.json`, plugin-knowledge sees `CTX_KNOWLEDGE_ENABLED=true` via `runtime.getSetting()`. CTX enrichment routes through pi-ai's `TEXT_LARGE` handler (no env vars needed). Embeddings still go through `plugin-local-embedding`.

---

## Task 4: Add CTX toggle to CLI onboarding

**File:** `src/runtime/eliza.ts`

- [x] After the embedding tier picker (Step 4b, around line 1508), add a new Step 4c for contextual enrichment:
  ```
  Step 4c: Knowledge enrichment (only when a cloud provider is available)
  ```
- [x] Gate the prompt: only show when the user selected a cloud provider (not ollama) or when `isPiAiEnabledFromEnv()` is true — local-only users skip this
- [x] Use `clack.confirm()`:
  ```
  "${name}: Enable contextual knowledge enrichment?
   This uses your cloud model to improve RAG search quality.
   Embeddings stay fully local. Recommended when using a cloud provider."
  ```
- [x] Default to `true` when a cloud provider is available
- [x] Store the choice in `configPatch.knowledge = { contextualEnrichment: true/false }`
- [x] Ensure the config patch is saved alongside existing embedding/provider config

**Acceptance:** New onboarding step appears after embedding picker when cloud provider is configured. Choice persists to `~/.milaidy/milaidy.json` under `knowledge.contextualEnrichment`.

---

## Task 5: Add `/knowledge` TUI command

**File:** `src/tui/index.ts`

- [x] Add `/knowledge` (and alias `/ctx`) command handler in the `setOnSubmit` command router (around line 240+):
  - No args: display current knowledge status
  - `on`/`off` arg: toggle `contextualEnrichment` in config and runtime
- [x] Status display should show:
  ```
  Knowledge Enrichment: ON
    Cloud model: anthropic/claude-sonnet-4-20250514 (via pi-ai)
    Embedding model: nomic-embed-text-v1.5.Q5_K_M.gguf (local, 768d)
    Docs path: ./docs
  ```
  Or when off:
  ```
  Knowledge Enrichment: OFF
    Embedding model: nomic-embed-text-v1.5.Q5_K_M.gguf (local, 768d)
    Enable with: /knowledge on
  ```
- [x] For model info: get the pi-ai controller's current large model via the existing `controller.getLargeModel()`, and the embedding preset from `getEmbeddingState()`
- [x] When toggling: update `config.knowledge.contextualEnrichment`, save config, and log a note that the change takes effect on next document ingestion (existing indexed docs are not re-enriched)
- [x] Add `/knowledge` to the `/help` output

**Acceptance:** `/knowledge` shows status, `/knowledge on` enables CTX with confirmation, `/knowledge off` disables. Status correctly reflects pi-ai model and local embedding model.

---

## Task 6: Add `/help` entry and documentation

**Files:** `src/tui/index.ts`, `docs/` (if exists)

- [x] Update the `/help` command output to include `/knowledge` description
- [x] Add a brief section to any user-facing docs about the hybrid CTX setup:
  - What it does (cloud enrichment + local embeddings)
  - How to enable (onboarding toggle or `/knowledge on` or `knowledge.contextualEnrichment: true` in config)
  - Cost/privacy tradeoff (document text goes to cloud, embeddings stay local)

**Acceptance:** `/help` lists `/knowledge`. Documentation is clear and accurate.

---

## Task 7: Tests

**Files:** `src/runtime/eliza.test.ts` (or new `src/runtime/knowledge-config.test.ts`)

- [x] Test that `knowledge.contextualEnrichment: true` in config results in `CTX_KNOWLEDGE_ENABLED: "true"` in runtime settings
- [x] Test that `knowledge.loadDocsOnStartup: false` results in `LOAD_DOCS_ON_STARTUP: "false"` in runtime settings
- [x] Test that `knowledge.docsPath` is forwarded as `KNOWLEDGE_PATH`
- [x] Test that when no `knowledge` config is set, no CTX-related settings are forwarded (preserving current default behavior)

**Acceptance:** `bun run test` passes, new tests cover the config forwarding logic.

---

## Notes

- **No changes to plugin-knowledge itself** — we work entirely within Milaidy's config/runtime layer
- **No new dependencies** — uses existing pi-ai, clack, and config infrastructure
- **Backward compatible** — CTX defaults to off, existing users are unaffected
- **Privacy note for docs/onboarding:** document text is sent to the cloud provider for enrichment; only embeddings (opaque vectors) are stored locally
- The `shouldUseCustomLLM()` function in plugin-knowledge checks `process.env` only — when those aren't set, it falls through to `runtime.useModel(TEXT_LARGE)` which is what we want (pi-ai handles it)
