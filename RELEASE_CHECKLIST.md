# Release Checklist

Step-by-step guide for cutting a new Milaidy release.

## Pre-release

### 1. Version bump

- [ ] Update `version` in `package.json` (e.g. `2.0.0-alpha.3` -> `2.0.0-alpha.4` or `2.0.0`)
- [ ] `src/runtime/version.ts` reads from `package.json` automatically — no manual sync needed
- [ ] Commit the version bump: `git commit -m "milaidy: bump version to <version>"`

### 2. Run tests

```bash
pnpm test            # unit + playwright tests
pnpm test:e2e        # e2e tests
pnpm check           # lint + format
```

- [ ] All tests pass
- [ ] No lint/format errors

### 3. Run the smoke test

```bash
bash scripts/smoke-test.sh
```

- [ ] Version consistency checks pass
- [ ] Build artifacts present (run `pnpm build` first)
- [ ] CLI boots without errors
- [ ] API server starts and responds
- [ ] npm pack validation passes
- [ ] Release workflow validation passes
- [ ] Desktop config validation passes

### 4. Validate npm package contents

```bash
pnpm release:check
```

- [ ] Required files present (`dist/index.js`, `dist/entry.js`, `dist/build-info.json`)
- [ ] No forbidden files (e.g. `dist/Milaidy.app/`)

### 5. Verify signing secrets (first release or rotation)

Ensure the following GitHub repository secrets are configured:

**macOS code signing + notarization:**
| Secret | Description |
|---|---|
| `CSC_LINK` | Base64-encoded `.p12` signing certificate |
| `CSC_KEY_PASSWORD` | Password for the `.p12` certificate |
| `APPLE_ID` | Apple Developer account email |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password from [appleid.apple.com](https://appleid.apple.com) |
| `APPLE_TEAM_ID` | Apple Developer Team ID |

**Windows code signing (optional):**
| Secret | Description |
|---|---|
| `WIN_CSC_LINK` | Base64-encoded `.pfx` code signing certificate |
| `WIN_CSC_KEY_PASSWORD` | Password for the `.pfx` certificate |

> Builds succeed without signing secrets but will trigger Gatekeeper warnings on macOS.

## Cutting the release

### 6. Tag and push

```bash
git tag v<version>           # e.g. git tag v2.0.0-alpha.4
git push origin v<version>
```

This triggers `.github/workflows/release.yml`, which:
1. Determines the version from the tag
2. Builds desktop apps for macOS (Intel + ARM), Windows, and Linux
3. Signs and notarizes macOS builds (when secrets are set)
4. Signs Windows builds (when secrets are set)
5. Generates SHA256 checksums (`SHA256SUMS.txt`)
6. Creates a GitHub Release with auto-generated release notes
7. Uploads all artifacts + checksums to the release

**Alternative — manual trigger:**
Go to Actions > "Build & Release" > Run workflow. Optionally set a tag name and/or create as draft.

### 7. Monitor the CI build

- [ ] Go to [Actions](https://github.com/milady-ai/milaidy/actions) and watch the "Build & Release" workflow
- [ ] All 4 platform builds succeed (macOS Intel, macOS ARM, Windows, Linux)
- [ ] Release job completes and creates the GitHub Release

## Post-release

### 8. Verify the GitHub Release

- [ ] Release page exists at `https://github.com/milady-ai/milaidy/releases/tag/v<version>`
- [ ] Release name: `Milaidy v<version>`
- [ ] Pre-release flag is set for alpha/beta/rc versions
- [ ] Release notes are auto-generated and look correct

### 9. Verify artifacts

- [ ] DMG files present for both macOS architectures (arm64 + x64)
- [ ] `.exe` installer present for Windows
- [ ] `.AppImage` and `.deb` present for Linux
- [ ] `SHA256SUMS.txt` present

### 10. Verify checksums

Download `SHA256SUMS.txt` and at least one artifact, then verify:

```bash
cd ~/Downloads
curl -fsSLO https://github.com/milady-ai/milaidy/releases/download/v<version>/SHA256SUMS.txt
curl -fsSLO https://github.com/milady-ai/milaidy/releases/download/v<version>/Milaidy-<version>-arm64.dmg
shasum -a 256 --check --ignore-missing SHA256SUMS.txt
```

- [ ] Checksum matches

### 11. macOS smoke test (signed + notarized DMG)

On a **clean macOS machine** (or one that has never opened this app):

1. Download the DMG from the release page
2. Open the DMG and drag Milaidy to Applications
3. Launch Milaidy from Applications
   - [ ] No Gatekeeper warning ("unidentified developer" or "damaged")
   - [ ] App launches and shows onboarding
4. Verify code signature:
   ```bash
   codesign -dv --verbose=4 /Applications/Milaidy.app
   ```
   - [ ] Shows valid signing identity
5. Verify notarization:
   ```bash
   spctl -a -vvv /Applications/Milaidy.app
   ```
   - [ ] Output includes "source=Notarized Developer ID"

### 12. CLI smoke test (npx)

On a clean environment:

```bash
npx milaidy@<version> --version
npx milaidy@<version> --help
```

- [ ] Version matches the release
- [ ] Help output shows all commands

### 13. npm publish (if applicable)

If this is an npm release (not just a desktop release):

```bash
npm publish                    # for stable releases
npm publish --tag alpha        # for alpha releases
npm publish --tag beta         # for beta releases
```

- [ ] Package published to npm
- [ ] `npx milaidy` resolves to the new version

### 14. Update download links (if needed)

The README uses `/releases/latest` links, which auto-resolve to the latest non-prerelease. For pre-releases, no link update is needed.

- [ ] For stable releases: verify `https://github.com/milady-ai/milaidy/releases/latest` points to the new release

## Rollback

If a critical issue is found after release:

1. **GitHub Release:** Edit the release and mark as draft, or delete it
2. **npm:** `npm unpublish milaidy@<version>` (within 72h) or publish a patch
3. **Git tag:** `git push origin :refs/tags/v<version>` to delete the remote tag

## Release types

| Type | Version example | npm tag | GitHub prerelease | Notes |
|---|---|---|---|---|
| Alpha | `2.0.0-alpha.3` | `alpha` | Yes | Early testing |
| Beta | `2.0.0-beta.1` | `beta` | Yes | Feature-complete, testing |
| RC | `2.0.0-rc.1` | `rc` | Yes | Release candidate |
| Stable | `2.0.0` | `latest` | No | Production release |
