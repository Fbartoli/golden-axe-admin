import { test as setup, expect } from '@playwright/test'

const AUTH_FILE = 'e2e/.auth/user.json'

setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login')

  // Fill in password and submit
  await page.getByPlaceholder('Enter admin password').fill('1234')
  await page.getByRole('button', { name: 'Sign In' }).click()

  // Wait for redirect to dashboard
  await page.waitForURL('/')

  // Verify we're on the dashboard
  await expect(page.getByText('Horusblock Admin')).toBeVisible()

  // Save auth state
  await page.context().storageState({ path: AUTH_FILE })
})
