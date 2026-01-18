/**
 * Example: Discovering elements on a page
 *
 * Run with: bunx tsx .claude/skills/webapp-testing/examples/element-discovery.ts
 *
 * Make sure dev server is running: bun run dev
 */

import { chromium } from 'playwright'

const BASE_URL = 'http://localhost:3001'

async function discoverElements() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  // Navigate and wait for page to fully load
  await page.goto(BASE_URL)
  await page.waitForLoadState('networkidle')

  // Discover all buttons
  const buttons = await page.locator('button').all()
  console.log(`Found ${buttons.length} buttons:`)
  for (let i = 0; i < buttons.length; i++) {
    const button = buttons[i]
    const isVisible = await button.isVisible()
    const text = isVisible ? await button.innerText() : '[hidden]'
    console.log(`  [${i}] ${text.substring(0, 50)}`)
  }

  // Discover tabs
  const tabs = await page.getByRole('tab').all()
  console.log(`\nFound ${tabs.length} tabs:`)
  for (const tab of tabs) {
    const text = await tab.innerText()
    const state = await tab.getAttribute('data-state')
    console.log(`  - ${text} (${state})`)
  }

  // Discover input fields
  const inputs = await page.locator('input, textarea, select').all()
  console.log(`\nFound ${inputs.length} input fields:`)
  for (const input of inputs) {
    const name = await input.getAttribute('name') || await input.getAttribute('id') || '[unnamed]'
    const type = await input.getAttribute('type') || 'text'
    const placeholder = await input.getAttribute('placeholder') || ''
    console.log(`  - ${name} (${type}) ${placeholder ? `"${placeholder}"` : ''}`)
  }

  // Take screenshot for visual reference
  await page.screenshot({ path: '/tmp/element-discovery.png', fullPage: true })
  console.log('\nScreenshot saved to /tmp/element-discovery.png')

  await browser.close()
}

discoverElements().catch(console.error)
