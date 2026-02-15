import { describe, expect, it } from "vitest";
import type { MilaidyConfig } from "../config/types.js";

/**
 * Extracts the knowledge-related runtime settings that would be forwarded
 * to an AgentRuntime, mirroring the logic in src/runtime/eliza.ts.
 *
 * This is a pure function so we can test the forwarding logic in isolation
 * without instantiating a full AgentRuntime.
 */
function buildKnowledgeSettings(
  config: Pick<MilaidyConfig, "knowledge">,
): Record<string, string> {
  return {
    ...(config.knowledge?.contextualEnrichment
      ? { CTX_KNOWLEDGE_ENABLED: "true" }
      : {}),
    ...(config.knowledge?.loadDocsOnStartup === false
      ? { LOAD_DOCS_ON_STARTUP: "false" }
      : {}),
    ...(config.knowledge?.docsPath
      ? { KNOWLEDGE_PATH: config.knowledge.docsPath }
      : {}),
  };
}

describe("knowledge config forwarding", () => {
  it("forwards CTX_KNOWLEDGE_ENABLED when contextualEnrichment is true", () => {
    const settings = buildKnowledgeSettings({
      knowledge: { contextualEnrichment: true },
    });
    expect(settings).toEqual({ CTX_KNOWLEDGE_ENABLED: "true" });
  });

  it("does not forward CTX_KNOWLEDGE_ENABLED when contextualEnrichment is false", () => {
    const settings = buildKnowledgeSettings({
      knowledge: { contextualEnrichment: false },
    });
    expect(settings).toEqual({});
  });

  it("forwards LOAD_DOCS_ON_STARTUP=false when loadDocsOnStartup is false", () => {
    const settings = buildKnowledgeSettings({
      knowledge: { loadDocsOnStartup: false },
    });
    expect(settings).toEqual({ LOAD_DOCS_ON_STARTUP: "false" });
  });

  it("does not forward LOAD_DOCS_ON_STARTUP when loadDocsOnStartup is true", () => {
    const settings = buildKnowledgeSettings({
      knowledge: { loadDocsOnStartup: true },
    });
    expect(settings).toEqual({});
  });

  it("forwards KNOWLEDGE_PATH when docsPath is set", () => {
    const settings = buildKnowledgeSettings({
      knowledge: { docsPath: "/data/my-docs" },
    });
    expect(settings).toEqual({ KNOWLEDGE_PATH: "/data/my-docs" });
  });

  it("forwards no knowledge settings when knowledge config is undefined", () => {
    const settings = buildKnowledgeSettings({});
    expect(settings).toEqual({});
  });

  it("forwards no knowledge settings when knowledge config is empty", () => {
    const settings = buildKnowledgeSettings({ knowledge: {} });
    expect(settings).toEqual({});
  });

  it("forwards all settings when all knowledge options are configured", () => {
    const settings = buildKnowledgeSettings({
      knowledge: {
        contextualEnrichment: true,
        loadDocsOnStartup: false,
        docsPath: "./my-knowledge",
      },
    });
    expect(settings).toEqual({
      CTX_KNOWLEDGE_ENABLED: "true",
      LOAD_DOCS_ON_STARTUP: "false",
      KNOWLEDGE_PATH: "./my-knowledge",
    });
  });
});
