/**
 * Example: Testing the complete login flow
 *
 * Run with: bunx tsx .claude/skills/webapp-testing/examples/login-flow.ts
 *
 * Make sure dev server is running: bun run dev
 */

import { chromium } from 'playwright'

const BASE_URL = 'http://localhost:3001'
const ADMIN_PASSWORD = '1234' // From .env.local

async function testLoginFlow() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  console.log('1. Navigating to login page...')
  await page.goto(`${BASE_URL}/login`)
  await page.waitForLoadState('networkidle')

  // Take screenshot of login page
  await page.screenshot({ path: '/tmp/01-login-page.png' })
  console.log('   Screenshot: /tmp/01-login-page.png')

  console.log('2. Entering password...')
  await page.getByPlaceholder('Enter admin password').fill(ADMIN_PASSWORD)

  console.log('3. Clicking Sign In...')
  await page.getByRole('button', { name: 'Sign In' }).click()

  // Wait for navigation to dashboard
  await page.waitForURL(`${BASE_URL}/`)
  await page.waitForLoadState('networkidle')

  // Verify dashboard loaded
  const title = page.getByText('Horusblock Admin')
  if (await title.isVisible()) {
    console.log('4. Successfully logged in!')
  } else {
    throw new Error('Dashboard not loaded')
  }

  // Take screenshot of dashboard
  await page.screenshot({ path: '/tmp/02-dashboard.png' })
  console.log('   Screenshot: /tmp/02-dashboard.png')

  console.log('5. Testing tab navigation...')
  const tabs = ['Users', 'Sync', 'Query', 'System', 'Notifications']
  for (const tab of tabs) {
    await page.getByRole('tab', { name: new RegExp(tab) }).click()
    await page.waitForTimeout(300)
    console.log(`   - ${tab} tab: OK`)
  }

  console.log('6. Testing logout...')
  await page.getByRole('button', { name: /Logout/i }).click()
  await page.waitForURL(`${BASE_URL}/login`)

  // Take screenshot after logout
  await page.screenshot({ path: '/tmp/03-logged-out.png' })
  console.log('   Screenshot: /tmp/03-logged-out.png')

  console.log('\n✓ All tests passed!')

  await browser.close()
}

testLoginFlow().catch((err) => {
  console.error('✗ Test failed:', err.message)
  process.exit(1)
})
