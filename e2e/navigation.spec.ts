import { test, expect } from '@playwright/test'

// Use authenticated state
test.use({ storageState: 'e2e/.auth/user.json' })

test.describe('Tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for initial page load
    await expect(page.getByText('Horusblock Admin')).toBeVisible()
  })

  test('should navigate to Users tab by clicking', async ({ page }) => {
    await page.getByRole('tab', { name: /Users/ }).click()
    await expect(page.getByRole('tab', { name: /Users/ })).toHaveAttribute('data-state', 'active')
  })

  test('should navigate to Sync tab by clicking', async ({ page }) => {
    await page.getByRole('tab', { name: /Sync/ }).click()
    await expect(page.getByRole('tab', { name: /Sync/ })).toHaveAttribute('data-state', 'active')
  })

  test('should navigate to Query tab by clicking', async ({ page }) => {
    await page.getByRole('tab', { name: /Query/ }).click()
    await expect(page.getByRole('tab', { name: /Query/ })).toHaveAttribute('data-state', 'active')
  })

  test('should navigate to System tab by clicking', async ({ page }) => {
    await page.getByRole('tab', { name: /System/ }).click()
    await expect(page.getByRole('tab', { name: /System/ })).toHaveAttribute('data-state', 'active')
  })

  test('should navigate to Notifications tab by clicking', async ({ page }) => {
    await page.getByRole('tab', { name: /Notifications/ }).click()
    await expect(page.getByRole('tab', { name: /Notifications/ })).toHaveAttribute('data-state', 'active')
  })

  test('should navigate between all tabs in sequence', async ({ page }) => {
    const tabs = ['Networks', 'Users', 'Sync', 'Query', 'System', 'Notifications']

    for (const tabName of tabs) {
      await page.getByRole('tab', { name: new RegExp(tabName) }).click()
      await expect(page.getByRole('tab', { name: new RegExp(tabName) })).toHaveAttribute(
        'data-state',
        'active'
      )
    }
  })
})

test.describe('Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Horusblock Admin')).toBeVisible()
    // Click somewhere to ensure body has focus (not an input)
    await page.locator('body').click()
  })

  test('should navigate to Networks tab with key 1', async ({ page }) => {
    // First go to another tab
    await page.getByRole('tab', { name: /Users/ }).click()
    await page.locator('body').click()

    await page.keyboard.press('1')
    await expect(page.getByRole('tab', { name: /Networks/ })).toHaveAttribute('data-state', 'active')
  })

  test('should navigate to Users tab with key 2', async ({ page }) => {
    await page.keyboard.press('2')
    await expect(page.getByRole('tab', { name: /Users/ })).toHaveAttribute('data-state', 'active')
  })

  test('should navigate to Sync tab with key 3', async ({ page }) => {
    await page.keyboard.press('3')
    await expect(page.getByRole('tab', { name: /Sync/ })).toHaveAttribute('data-state', 'active')
  })

  test('should navigate to Query tab with key 4', async ({ page }) => {
    await page.keyboard.press('4')
    await expect(page.getByRole('tab', { name: /Query/ })).toHaveAttribute('data-state', 'active')
  })

  test('should navigate to System tab with key 5', async ({ page }) => {
    await page.keyboard.press('5')
    await expect(page.getByRole('tab', { name: /System/ })).toHaveAttribute('data-state', 'active')
  })

  test('should navigate to Notifications tab with key 6', async ({ page }) => {
    await page.keyboard.press('6')
    await expect(page.getByRole('tab', { name: /Notifications/ })).toHaveAttribute(
      'data-state',
      'active'
    )
  })

  test('should not trigger keyboard shortcuts when typing in input', async ({ page }) => {
    // Open command palette (which has an input)
    await page.keyboard.press('Meta+k')
    const input = page.getByPlaceholder('Type a command or search...')
    await expect(input).toBeVisible()

    // Focus the input and type - should not trigger tab navigation
    await input.focus()
    await input.fill('test')

    // Close command palette
    await page.keyboard.press('Escape')

    // Networks tab should still be active (keyboard shortcut should not have triggered)
    await expect(page.getByRole('tab', { name: /Networks/ })).toHaveAttribute('data-state', 'active')
  })

  test('should navigate via command palette', async ({ page }) => {
    await page.keyboard.press('Meta+k')

    // Click on "Go to Users"
    await page.getByText('Go to Users').click()

    // Should navigate to Users tab
    await expect(page.getByRole('tab', { name: /Users/ })).toHaveAttribute('data-state', 'active')

    // Command palette should be closed
    await expect(page.getByPlaceholder('Type a command or search...')).not.toBeVisible()
  })
})
