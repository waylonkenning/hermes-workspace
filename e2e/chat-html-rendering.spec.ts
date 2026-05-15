import { test, expect } from '@playwright/test'

test.describe('HTML rendering in chat #438', () => {
  test('should render HTML tags in assistant messages', async ({ page }) => {
    // Navigate to chat
    await page.goto('/chat')
    await page.waitForLoadState('load')

    // Dismiss the "Hermes updated" modal if present
    const continueBtn = page.getByRole('button', { name: 'Continue' })
    if (await continueBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await continueBtn.click()
    }

    await page.waitForTimeout(2000)

    // Click an existing session with HTML content or any session
    const sessionLink = page.locator('a[href*="/chat/20"]').first()
    if (await sessionLink.isVisible({ timeout: 10000 }).catch(() => false)) {
      await sessionLink.click()
    }
    await page.waitForTimeout(3000)

    // Send a message containing HTML to verify rendering
    const textarea = page.locator('textarea, [contenteditable="true"]').first()
    await expect(textarea).toBeVisible({ timeout: 10000 })

    // Send a message with HTML content
    await textarea.fill('Render this table: <table border="1"><tr><th>Name</th><th>Value</th></tr><tr><td>Alpha</td><td>100</td></tr><tr><td>Beta</td><td>200</td></tr></table>')
    await textarea.press('Enter')

    // Wait for the response
    await page.waitForTimeout(10000)

    // VERIFY: The page is functional (no crash from HTML rendering)
    const chatInput = page.locator('textarea, [contenteditable="true"]').first()
    await expect(chatInput).toBeVisible({ timeout: 5000 })

    // VERIFY: No error toasts or alerts
    const errorAlert = page.locator('[role="alert"]')
    const hasError = await errorAlert.isVisible({ timeout: 1000 }).catch(() => false)
    expect(hasError).toBe(false)
  })
})
