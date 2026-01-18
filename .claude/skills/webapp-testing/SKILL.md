---
name: webapp-testing
description: Toolkit for interacting with and testing local web applications using Playwright. Supports verifying frontend functionality, debugging UI behavior, capturing browser screenshots, and viewing browser logs.
license: Complete terms in LICENSE.txt
---

# Web Application Testing

To test local web applications, write TypeScript Playwright scripts using `bunx playwright test` or standalone scripts.

## Project Environment

- **Runtime**: Bun
- **Dev server**: `bun run dev` on port **3001**
- **Framework**: Next.js 16 with App Router
- **Auth**: Password-based login (password: from `ADMIN_PASSWORD` env var, default: `1234`)
- **Playwright config**: `playwright.config.ts` already configured

## Quick Reference

**Run existing e2e tests:**
```bash
bun run test:e2e              # Run all tests
bun run test:e2e:ui           # Interactive UI mode
bun run test:e2e:debug        # Debug mode
```

**Run a single test file:**
```bash
bunx playwright test e2e/login.spec.ts
```

**Run tests with specific browser:**
```bash
bunx playwright test --project=chromium
```

## Decision Tree: Choosing Your Approach

```
User task → Is the dev server already running?
    ├─ No → Playwright config auto-starts server (webServer config)
    │        Just run: bunx playwright test
    │
    └─ Yes → Run tests directly or use MCP tools:
        1. Use mcp__plugin_playwright_playwright__browser_snapshot for DOM inspection
        2. Use mcp__plugin_playwright_playwright__browser_click for interactions
        3. Use mcp__plugin_playwright_playwright__browser_take_screenshot for visual capture
```

## Writing New Tests

Create test files in `e2e/` directory following this pattern:

```typescript
import { test, expect } from '@playwright/test'

// For authenticated tests, use stored session
test.use({ storageState: 'e2e/.auth/user.json' })

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should do something', async ({ page }) => {
    // Wait for page to be ready
    await page.waitForLoadState('networkidle')

    // Find and interact with elements
    await page.getByRole('button', { name: 'Click Me' }).click()

    // Assert expected state
    await expect(page.getByText('Success')).toBeVisible()
  })
})
```

## Authentication Setup

The project uses `e2e/auth.setup.ts` to handle login once and save session state.
Tests that need authentication should use:

```typescript
test.use({ storageState: 'e2e/.auth/user.json' })
```

## Common Selectors for This Project

| Element | Selector |
|---------|----------|
| Login input | `page.getByPlaceholder('Enter admin password')` |
| Sign In button | `page.getByRole('button', { name: 'Sign In' })` |
| Tab navigation | `page.getByRole('tab', { name: /TabName/ })` |
| Logout button | `page.getByRole('button', { name: /Logout/i })` |
| Theme toggle | `page.getByRole('button', { name: /Switch to (light\|dark) mode/i })` |
| Command palette | `page.getByPlaceholder('Type a command or search...')` |

## Standalone Script Pattern

For quick one-off tests without the full test framework:

```typescript
// scripts/check-login.ts
import { chromium } from 'playwright'

const BASE_URL = 'http://localhost:3001'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  await page.goto(`${BASE_URL}/login`)
  await page.waitForLoadState('networkidle')

  // Take screenshot
  await page.screenshot({ path: '/tmp/login.png' })
  console.log('Screenshot saved to /tmp/login.png')

  await browser.close()
}

main().catch(console.error)
```

Run with: `bunx tsx scripts/check-login.ts`

## MCP Playwright Tools

When server is running, use MCP tools for interactive testing:

- `mcp__plugin_playwright_playwright__browser_navigate` - Go to URL
- `mcp__plugin_playwright_playwright__browser_snapshot` - Get accessibility tree (best for finding selectors)
- `mcp__plugin_playwright_playwright__browser_click` - Click elements
- `mcp__plugin_playwright_playwright__browser_type` - Type text
- `mcp__plugin_playwright_playwright__browser_take_screenshot` - Capture visual state

## Best Practices

- **Always wait for load state** before interacting: `await page.waitForLoadState('networkidle')`
- **Use role-based selectors** when possible: `getByRole()`, `getByText()`, `getByPlaceholder()`
- **Handle dynamic content** with `waitForSelector()` or `expect().toBeVisible()`
- **Keep tests isolated** - each test should be independent
- **Use test.describe()** to group related tests

## Reference Files

- `e2e/auth.setup.ts` - Authentication setup
- `e2e/login.spec.ts` - Login page tests
- `e2e/dashboard.spec.ts` - Dashboard UI tests
- `e2e/navigation.spec.ts` - Tab navigation tests
- `playwright.config.ts` - Playwright configuration
