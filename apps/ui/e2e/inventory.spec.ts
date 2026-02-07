import { test, expect } from "@playwright/test";
import { mockApi } from "./helpers";

// ═══════════════════════════════════════════════════════════════════════════
// Header wallet icon
// ═══════════════════════════════════════════════════════════════════════════

test.describe("Header — wallet icon", () => {
  test("shows wallet icon when addresses are configured", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");
    await page.waitForTimeout(500);

    const walletBtn = page.locator(".wallet-btn");
    await expect(walletBtn).toBeVisible();
  });

  test("hides wallet icon when no addresses configured", async ({ page }) => {
    await mockApi(page, { walletAddresses: null });
    await page.goto("/");
    await page.waitForTimeout(500);

    const walletBtn = page.locator(".wallet-btn");
    await expect(walletBtn).not.toBeVisible();
  });

  test("shows address tooltip on hover", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");
    await page.waitForTimeout(500);

    // Hover over wallet wrapper
    const walletWrapper = page.locator(".wallet-wrapper");
    await walletWrapper.hover();
    await page.waitForTimeout(300);

    // Should show truncated EVM address
    await expect(page.locator(".wallet-tooltip")).toBeVisible();
    await expect(page.locator("text=EVM")).toBeVisible();
    await expect(page.locator("text=SOL")).toBeVisible();
    // Truncated EVM address: 0xf39F...2266
    await expect(page.locator(".wallet-addr-row code").first()).toBeVisible();
  });

  test("shows copy buttons in tooltip", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");
    await page.waitForTimeout(500);

    const walletWrapper = page.locator(".wallet-wrapper");
    await walletWrapper.hover();
    await page.waitForTimeout(300);

    const copyButtons = page.locator(".wallet-tooltip .copy-btn");
    await expect(copyButtons).toHaveCount(2); // EVM + SOL
  });

  test("clicking wallet icon navigates to inventory", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");
    await page.waitForTimeout(500);

    await page.locator(".wallet-btn").click();
    await page.waitForTimeout(300);

    // Should be on inventory tab
    await expect(page.getByRole("heading", { name: "Inventory" })).toBeVisible();
    expect(page.url()).toContain("/inventory");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Navigation — inventory tab
// ═══════════════════════════════════════════════════════════════════════════

test.describe("Navigation — inventory tab", () => {
  test("inventory tab appears in navigation", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");
    await page.waitForTimeout(300);

    const inventoryLink = page.locator("a").filter({ hasText: "Inventory" });
    await expect(inventoryLink).toBeVisible();
  });

  test("clicking inventory tab shows inventory page", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");
    await page.locator("a").filter({ hasText: "Inventory" }).click();
    await page.waitForTimeout(300);

    await expect(page.getByRole("heading", { name: "Inventory" })).toBeVisible();
  });

  test("direct navigation to /inventory works", async ({ page }) => {
    await mockApi(page);
    await page.goto("/inventory");
    await page.waitForTimeout(500);

    await expect(page.getByRole("heading", { name: "Inventory" })).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Inventory — API key setup flow
// ═══════════════════════════════════════════════════════════════════════════

test.describe("Inventory — setup flow (no API keys)", () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page, { walletConfig: { alchemyKeySet: false, heliusKeySet: false } });
    await page.goto("/inventory");
    await page.waitForTimeout(500);
  });

  test("shows setup instructions when no API keys configured", async ({ page }) => {
    await expect(page.locator("text=API keys from blockchain data providers")).toBeVisible();
  });

  test("shows Alchemy setup card with link", async ({ page }) => {
    await expect(page.locator("h3").filter({ hasText: "Alchemy" })).toBeVisible();
    await expect(page.locator("a[href*='dashboard.alchemy.com']")).toBeVisible();
  });

  test("shows Helius setup card with link", async ({ page }) => {
    await expect(page.locator("h3").filter({ hasText: "Helius" })).toBeVisible();
    await expect(page.locator("a[href*='dev.helius.xyz']")).toBeVisible();
  });

  test("shows Birdeye setup card with optional label", async ({ page }) => {
    await expect(page.locator("h3").filter({ hasText: "Birdeye" })).toBeVisible();
    await expect(page.locator("text=optional").first()).toBeVisible();
  });

  test("shows input fields for API keys", async ({ page }) => {
    const alchemyInput = page.locator("input[data-wallet-config='ALCHEMY_API_KEY']");
    const heliusInput = page.locator("input[data-wallet-config='HELIUS_API_KEY']");
    const birdeyeInput = page.locator("input[data-wallet-config='BIRDEYE_API_KEY']");

    await expect(alchemyInput).toBeVisible();
    await expect(heliusInput).toBeVisible();
    await expect(birdeyeInput).toBeVisible();
  });

  test("Save API Keys button is present", async ({ page }) => {
    await expect(page.locator("button").filter({ hasText: "Save API Keys" })).toBeVisible();
  });

  test("saving keys transitions to balance view", async ({ page }) => {
    // Fill in keys
    await page.locator("input[data-wallet-config='ALCHEMY_API_KEY']").fill("test-alchemy-key");
    await page.locator("input[data-wallet-config='HELIUS_API_KEY']").fill("test-helius-key");

    // Click save
    await page.locator("button").filter({ hasText: "Save API Keys" }).click();
    await page.waitForTimeout(1000);

    // Should now show the tokens/NFTs sub-tabs (balance view)
    await expect(page.locator("button.inventory-subtab").filter({ hasText: "Tokens" })).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Inventory — tokens view
// ═══════════════════════════════════════════════════════════════════════════

test.describe("Inventory — tokens view", () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page, { walletConfig: { alchemyKeySet: true, heliusKeySet: true } });
    await page.goto("/");
    await page.waitForTimeout(300);
    await page.locator("a").filter({ hasText: "Inventory" }).click();
    await page.waitForTimeout(1500);
  });

  test("shows Tokens and NFTs sub-tabs", async ({ page }) => {
    await expect(page.locator("button.inventory-subtab").filter({ hasText: "Tokens" })).toBeVisible();
    await expect(page.locator("button.inventory-subtab").filter({ hasText: "NFTs" })).toBeVisible();
  });

  test("shows Refresh button", async ({ page }) => {
    await expect(page.locator("button").filter({ hasText: "Refresh" })).toBeVisible();
  });

  test("shows EVM wallet section with address", async ({ page }) => {
    await expect(page.locator("text=EVM Wallet")).toBeVisible();
    await expect(page.locator("text=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")).toBeVisible();
  });

  test("shows Ethereum chain with ETH balance", async ({ page }) => {
    await expect(page.locator(".chain-header").filter({ hasText: "Ethereum" })).toBeVisible();
    await expect(page.locator(".token-symbol").filter({ hasText: "ETH" }).first()).toBeVisible();
  });

  test("shows ERC-20 token balances", async ({ page }) => {
    await expect(page.locator(".token-symbol").filter({ hasText: "USDC" }).first()).toBeVisible();
    await expect(page.locator(".token-symbol").filter({ hasText: "WBTC" })).toBeVisible();
  });

  test("shows Solana wallet section", async ({ page }) => {
    await expect(page.locator("text=Solana Wallet")).toBeVisible();
  });

  test("shows SOL balance", async ({ page }) => {
    const solRow = page.locator(".token-row").filter({ hasText: "SOL" }).filter({ hasText: "Native" });
    await expect(solRow).toBeVisible();
  });

  test("shows Base chain section", async ({ page }) => {
    await expect(page.locator(".chain-header").filter({ hasText: "Base" })).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Inventory — NFTs view
// ═══════════════════════════════════════════════════════════════════════════

test.describe("Inventory — NFTs view", () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page, { walletConfig: { alchemyKeySet: true, heliusKeySet: true } });
    await page.goto("/");
    await page.waitForTimeout(300);
    await page.locator("a").filter({ hasText: "Inventory" }).click();
    await page.waitForTimeout(1500);
  });

  test("switching to NFTs tab shows NFTs", async ({ page }) => {
    await page.locator("button.inventory-subtab").filter({ hasText: "NFTs" }).click();
    await page.waitForTimeout(1000);

    // Should show an NFT card
    await expect(page.locator(".nft-card").first()).toBeVisible();
  });

  test("shows EVM NFTs grouped by chain", async ({ page }) => {
    await page.locator("button.inventory-subtab").filter({ hasText: "NFTs" }).click();
    await page.waitForTimeout(1000);

    await expect(page.locator("text=Ethereum").first()).toBeVisible();
    await expect(page.locator(".nft-name").filter({ hasText: "Bored Ape #1234" })).toBeVisible();
  });

  test("shows Solana NFTs", async ({ page }) => {
    await page.locator("button.inventory-subtab").filter({ hasText: "NFTs" }).click();
    await page.waitForTimeout(1000);

    await expect(page.locator("text=Solana").first()).toBeVisible();
    await expect(page.locator(".nft-name").filter({ hasText: "DRiP Drop #42" })).toBeVisible();
  });

  test("NFT cards show collection name", async ({ page }) => {
    await page.locator("button.inventory-subtab").filter({ hasText: "NFTs" }).click();
    await page.waitForTimeout(1000);

    await expect(page.locator(".nft-collection").filter({ hasText: "Bored Ape Yacht Club" })).toBeVisible();
    await expect(page.locator(".nft-collection").filter({ hasText: "DRiP" })).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Config — wallet API keys section
// ═══════════════════════════════════════════════════════════════════════════

test.describe("Config — wallet API keys", () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await page.goto("/");
    await page.locator("a").filter({ hasText: "Config" }).click();
    await page.waitForTimeout(500);
  });

  test("shows Wallet API Keys section", async ({ page }) => {
    await expect(page.locator("text=Wallet API Keys")).toBeVisible();
  });

  test("shows ALCHEMY_API_KEY input", async ({ page }) => {
    await expect(page.locator("code").filter({ hasText: "ALCHEMY_API_KEY" })).toBeVisible();
    await expect(page.locator("a[href*='dashboard.alchemy.com']")).toBeVisible();
  });

  test("shows HELIUS_API_KEY input", async ({ page }) => {
    await expect(page.locator("code").filter({ hasText: "HELIUS_API_KEY" })).toBeVisible();
    await expect(page.locator("a[href*='dev.helius.xyz']")).toBeVisible();
  });

  test("shows BIRDEYE_API_KEY input", async ({ page }) => {
    await expect(page.locator("code").filter({ hasText: "BIRDEYE_API_KEY" })).toBeVisible();
    await expect(page.locator("a[href*='birdeye.so']")).toBeVisible();
  });

  test("shows Save API Keys button", async ({ page }) => {
    // There may be multiple "Save API Keys" buttons (from inventory setup too)
    // but the config page should have one
    const saveBtn = page.locator("button").filter({ hasText: "Save API Keys" });
    await expect(saveBtn.first()).toBeVisible();
  });

  test("shows set/not-set indicator for keys", async ({ page }) => {
    // Default mock has no keys set
    const notSetLabels = page.locator("text=not set");
    expect(await notSetLabels.count()).toBeGreaterThanOrEqual(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Config — key export (Danger Zone)
// ═══════════════════════════════════════════════════════════════════════════

test.describe("Config — private key export", () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await page.goto("/");
    await page.locator("a").filter({ hasText: "Config" }).click();
    await page.waitForTimeout(500);
  });

  test("shows Export Private Keys section in Danger Zone", async ({ page }) => {
    await expect(page.locator("text=Export Private Keys")).toBeVisible();
    await expect(page.locator("text=Never share these with anyone")).toBeVisible();
  });

  test("Export Keys button is visible", async ({ page }) => {
    await expect(page.locator("button").filter({ hasText: "Export Keys" })).toBeVisible();
  });

  test("clicking Export Keys shows confirmation dialog", async ({ page }) => {
    // Listen for the dialog
    page.on("dialog", async (dialog) => {
      expect(dialog.message()).toContain("private keys");
      await dialog.accept();
    });

    await page.locator("button").filter({ hasText: "Export Keys" }).click();
    await page.waitForTimeout(500);

    // After accepting, should show the key export box
    await expect(page.locator(".key-export-box")).toBeVisible();
  });

  test("exported keys contain EVM and Solana sections", async ({ page }) => {
    // Auto-accept dialog
    page.on("dialog", async (dialog) => await dialog.accept());

    await page.locator("button").filter({ hasText: "Export Keys" }).click();
    await page.waitForTimeout(500);

    await expect(page.locator(".key-export-box strong").filter({ hasText: "EVM Private Key" })).toBeVisible();
    await expect(page.locator(".key-export-box strong").filter({ hasText: "Solana Private Key" })).toBeVisible();
  });

  test("exported keys have copy buttons", async ({ page }) => {
    page.on("dialog", async (dialog) => await dialog.accept());

    await page.locator("button").filter({ hasText: "Export Keys" }).click();
    await page.waitForTimeout(500);

    const copyButtons = page.locator(".key-export-box .copy-btn");
    await expect(copyButtons).toHaveCount(2);
  });

  test("clicking Hide Keys hides the export box", async ({ page }) => {
    page.on("dialog", async (dialog) => await dialog.accept());

    // Show keys
    await page.locator("button").filter({ hasText: "Export Keys" }).click();
    await page.waitForTimeout(500);
    await expect(page.locator(".key-export-box")).toBeVisible();

    // Hide keys
    await page.locator("button").filter({ hasText: "Hide Keys" }).click();
    await page.waitForTimeout(300);
    await expect(page.locator(".key-export-box")).not.toBeVisible();
  });

  test("dismissing confirmation dialog does not show keys", async ({ page }) => {
    // Dismiss (cancel) the dialog
    page.on("dialog", async (dialog) => await dialog.dismiss());

    await page.locator("button").filter({ hasText: "Export Keys" }).click();
    await page.waitForTimeout(500);

    // Should NOT show the key export box
    await expect(page.locator(".key-export-box")).not.toBeVisible();
  });
});
