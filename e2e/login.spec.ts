import { test, expect } from '@playwright/test'

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('should display login form', async ({ page }) => {
    // Check page title/header
    await expect(page.getByText('Horusblock Admin')).toBeVisible()

    // Check form elements
    await expect(page.getByPlaceholder('Enter admin password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
  })

  test('should disable submit button when password is empty', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: 'Sign In' })
    await expect(submitButton).toBeDisabled()
  })

  test('should enable submit button when password is entered', async ({ page }) => {
    await page.getByPlaceholder('Enter admin password').fill('test')
    const submitButton = page.getByRole('button', { name: 'Sign In' })
    await expect(submitButton).toBeEnabled()
  })

  test('should show error for invalid password', async ({ page }) => {
    await page.getByPlaceholder('Enter admin password').fill('wrongpassword')
    await page.getByRole('button', { name: 'Sign In' }).click()

    // Wait for error message
    await expect(page.getByText('Invalid password')).toBeVisible()
  })

  test('should redirect to dashboard after successful login', async ({ page }) => {
    await page.getByPlaceholder('Enter admin password').fill('1234')
    await page.getByRole('button', { name: 'Sign In' }).click()

    // Wait for redirect
    await page.waitForURL('/')

    // Verify dashboard is displayed
    await expect(page.getByText('Horusblock Admin')).toBeVisible()
  })

  test('should show loading state while authenticating', async ({ page }) => {
    await page.getByPlaceholder('Enter admin password').fill('1234')

    // Slow down the network to see loading state
    await page.route('/api/auth/login', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500))
      await route.continue()
    })

    await page.getByRole('button', { name: 'Sign In' }).click()

    // Check for loading state
    await expect(page.getByText('Signing in')).toBeVisible()
  })
})
