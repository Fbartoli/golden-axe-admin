import { test, expect } from '@playwright/test'

// Use authenticated state
test.use({ storageState: 'e2e/.auth/user.json' })

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display dashboard header', async ({ page }) => {
    await expect(page.getByText('Horusblock Admin')).toBeVisible()
  })

  test('should display all tab triggers', async ({ page }) => {
    const tabs = ['Networks', 'Users', 'Sync', 'Query', 'System', 'Notifications']

    for (const tab of tabs) {
      await expect(page.getByRole('tab', { name: new RegExp(tab) })).toBeVisible()
    }
  })

  test('should have Networks tab active by default', async ({ page }) => {
    const networksTab = page.getByRole('tab', { name: /Networks/ })
    await expect(networksTab).toHaveAttribute('data-state', 'active')
  })

  test('should display logout button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Logout/i })).toBeVisible()
  })

  test('should display theme toggle button', async ({ page }) => {
    // The theme toggle button has aria-label for accessibility
    const themeToggle = page.getByRole('button', { name: /Switch to (light|dark) mode/i })
    await expect(themeToggle).toBeVisible()
  })

  test('should display search button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Search/i })).toBeVisible()
  })

  test('should toggle theme when clicking theme button', async ({ page }) => {
    const themeToggle = page.getByRole('button', { name: /Switch to light mode/i })
    await themeToggle.click()

    // After clicking, the button label should change
    await expect(page.getByRole('button', { name: /Switch to dark mode/i })).toBeVisible()
  })

  test('should logout and redirect to login page', async ({ page }) => {
    await page.getByRole('button', { name: /Logout/i }).click()

    // Wait for redirect to login
    await page.waitForURL('/login')

    // Verify we're on the login page
    await expect(page.getByPlaceholder('Enter admin password')).toBeVisible()
  })

  test('should open command palette with Cmd+K', async ({ page }) => {
    await page.keyboard.press('Meta+k')

    // Command palette should be visible
    await expect(page.getByPlaceholder('Type a command or search...')).toBeVisible()
  })

  test('should close command palette with Escape', async ({ page }) => {
    await page.keyboard.press('Meta+k')
    await expect(page.getByPlaceholder('Type a command or search...')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.getByPlaceholder('Type a command or search...')).not.toBeVisible()
  })

  test('should show navigation items in command palette', async ({ page }) => {
    await page.keyboard.press('Meta+k')

    // Check for navigation items
    await expect(page.getByText('Go to Networks')).toBeVisible()
    await expect(page.getByText('Go to Users')).toBeVisible()
    await expect(page.getByText('Go to Sync')).toBeVisible()
    await expect(page.getByText('Go to Query')).toBeVisible()
    await expect(page.getByText('Go to System')).toBeVisible()
    await expect(page.getByText('Go to Notifications')).toBeVisible()
  })
})
