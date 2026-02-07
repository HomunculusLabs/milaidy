import type { Command } from "commander";
import type { AgentRuntime } from "@elizaos/core";
import { theme } from "../../terminal/theme.js";
import { formatDocsLink } from "../../terminal/links.js";
import { runCommandWithRuntime } from "../cli-utils.js";

const defaultRuntime = { error: console.error, exit: process.exit };

/**
 * Start the full Milaidy stack: ElizaOS runtime + API server + Control UI
 * + interactive CLI chat.
 */
async function startAction(options: { port?: string }) {
  await runCommandWithRuntime(defaultRuntime, async () => {
    const crypto = await import("node:crypto");
    const readline = await import("node:readline");
    const { startEliza } = await import("../../eliza.js");
    const { startApiServer } = await import("../../api/server.js");
    const { setRestartHandler } = await import("../../restart.js");
    const {
      ChannelType,
      createMessageMemory,
      logger,
      stringToUuid,
    } = await import("@elizaos/core");
    type UUID = import("@elizaos/core").UUID;

    const port = options.port ? Number(options.port) : (Number(process.env.MILAIDY_PORT) || 2138);

    let currentRuntime: AgentRuntime | null = null;
    let apiUpdateRuntime: ((rt: AgentRuntime) => void) | null = null;
    let isRestarting = false;
    let isShuttingDown = false;

    async function createRuntime(): Promise<AgentRuntime> {
      if (currentRuntime) {
        try { await currentRuntime.stop(); } catch (err) {
          logger.warn(`[milaidy] Error stopping old runtime: ${err instanceof Error ? err.message : err}`);
        }
        currentRuntime = null;
      }
      const result = await startEliza({ headless: true });
      if (!result) throw new Error("startEliza returned null — runtime failed to initialize");
      currentRuntime = result as AgentRuntime;
      return currentRuntime;
    }

    async function handleRestart(reason?: string): Promise<void> {
      if (isShuttingDown) return;
      if (isRestarting) { logger.warn("[milaidy] Restart already in progress, skipping"); return; }
      isRestarting = true;
      try {
        logger.info(`[milaidy] Restart requested${reason ? ` (${reason})` : ""} — bouncing runtime…`);
        const rt = await createRuntime();
        logger.info(`[milaidy] Runtime restarted — agent: ${rt.character.name ?? "Milaidy"}`);
        if (apiUpdateRuntime) apiUpdateRuntime(rt);
      } finally { isRestarting = false; }
    }

    async function shutdown(): Promise<void> {
      if (isShuttingDown) return;
      isShuttingDown = true;
      console.log("\nGoodbye!");
      if (currentRuntime) {
        try { await currentRuntime.stop(); } catch { /* ignore */ }
        currentRuntime = null;
      }
      process.exit(0);
    }

    process.on("SIGINT", () => void shutdown());
    process.on("SIGTERM", () => void shutdown());

    setRestartHandler(handleRestart);

    // 1. Start the API server (serves Control UI + REST API)
    const { port: actualPort, updateRuntime } = await startApiServer({
      port,
      serveUi: true,
      onRestart: async () => { await handleRestart("api"); return currentRuntime; },
    });
    apiUpdateRuntime = updateRuntime;

    // 2. Boot the ElizaOS agent runtime
    const runtime = await createRuntime();
    const agentName = runtime.character.name ?? "Milaidy";

    // 3. Wire the live runtime into the API server
    updateRuntime(runtime);

    console.log(`\n  Milaidy is running ✓`);
    console.log(`  UI:  http://localhost:${actualPort}`);
    console.log(`  API: http://localhost:${actualPort}/api/status\n`);

    // 4. Interactive CLI chat (alongside the server)
    if (!process.stdin.isTTY) return; // no chat in non-interactive mode

    const userId = crypto.randomUUID() as UUID;
    const roomId = stringToUuid(`${agentName}-chat-room`);
    const worldId = stringToUuid(`${agentName}-chat-world`);

    try {
      await runtime.ensureConnection({
        entityId: userId,
        roomId, worldId,
        userName: "User",
        source: "cli",
        channelId: `${agentName}-chat`,
        type: ChannelType.DM,
      });
    } catch {
      const freshRoomId = crypto.randomUUID() as UUID;
      const freshWorldId = crypto.randomUUID() as UUID;
      await runtime.ensureConnection({
        entityId: userId,
        roomId: freshRoomId,
        worldId: freshWorldId,
        userName: "User",
        source: "cli",
        channelId: `${agentName}-chat`,
        type: ChannelType.DM,
      });
    }

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log(`💬 Chat with ${agentName} (type 'exit' to quit)\n`);

    const prompt = () => {
      rl.question("You: ", async (input) => {
        const text = input.trim();

        if (text.toLowerCase() === "exit" || text.toLowerCase() === "quit") {
          rl.close();
          await shutdown();
          return;
        }
        if (!text) { prompt(); return; }

        const message = createMessageMemory({
          id: crypto.randomUUID() as UUID,
          entityId: userId,
          roomId,
          content: { text, source: "client_chat", channelType: ChannelType.DM },
        });

        process.stdout.write(`${agentName}: `);
        await currentRuntime?.messageService?.handleMessage(
          currentRuntime,
          message,
          async (content) => {
            if (content?.text) process.stdout.write(content.text);
            return [];
          },
        );
        console.log("\n");
        prompt();
      });
    };

    prompt();
  });
}

export function registerStartCommand(program: Command) {
  program
    .command("start", { isDefault: true })
    .description("Start the Milaidy agent with API server, Control UI, and CLI chat")
    .option("-p, --port <port>", "API/UI server port (default: 2138)")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/getting-started", "docs.milady.ai/getting-started")}\n`,
    )
    .action(startAction);

  program
    .command("run")
    .description("Alias for start")
    .option("-p, --port <port>", "API/UI server port (default: 2138)")
    .action(startAction);
}
