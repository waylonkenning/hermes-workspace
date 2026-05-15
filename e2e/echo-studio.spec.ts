import { test, expect } from '@playwright/test'

const BASE = process.env.HERMES_WORKSPACE_URL || 'http://localhost:3002'

test.describe('Echo Studio', () => {
  test('renders the Echo Studio page with create tab', async ({ page }) => {
    await page.goto(`${BASE}/echo-studio`)
    await page.waitForTimeout(2000)

    // Dismiss any splash/update overlay
    await page.evaluate(() => {
      document.querySelectorAll('.fixed.inset-0').forEach((el) => el.remove())
    })
    await page.waitForTimeout(300)

    // Header
    await expect(page.locator('h1').filter({ hasText: 'Echo Studio' })).toBeVisible()
    await expect(page.locator('text=Describe what you want')).toBeVisible()

    // Tabs
    await expect(page.getByRole('button', { name: 'create', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'manage', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'theme', exact: true })).toBeVisible()

    // Form inputs
    await expect(page.locator('input[placeholder*="tool-analytics"]')).toBeVisible()
    await expect(page.locator('input[placeholder*="Tool Analytics"]')).toBeVisible()
    await expect(page.locator('textarea')).toBeVisible()

    // Create button
    await expect(page.locator('button').filter({ hasText: 'Create Full Page' })).toBeVisible()

    // Quick templates
    await expect(page.locator('text=Analytics Dashboard')).toBeVisible()
    await expect(page.locator('text=System Monitor')).toBeVisible()
    await expect(page.locator('text=Chat Analytics')).toBeVisible()

    // Stats cards
    await expect(page.locator('text=Screens Created')).toBeVisible()
    await expect(page.locator('text=Widgets Active')).toBeVisible()
    await expect(page.locator('text=API Endpoints')).toBeVisible()
  })

  test('quick template fills form fields', async ({ page }) => {
    await page.goto(`${BASE}/echo-studio`)
    await page.waitForTimeout(2000)

    // Dismiss any splash/update overlay
    await page.evaluate(() => {
      const splash = document.getElementById('splash-screen')
      if (splash) splash.remove()
      // Also remove any other fullscreen overlays/modals
      document.querySelectorAll('.fixed.inset-0').forEach((el) => el.remove())
    })
    await page.waitForTimeout(300)

    // Click Analytics Dashboard template
    await page.getByRole('button', { name: 'Analytics Dashboard' }).click()
    await page.waitForTimeout(300)

    // Check that inputs were filled
    const pageIdInput = page.locator('input[placeholder*="tool-analytics"]')
    const pageTitleInput = page.locator('input[placeholder*="Tool Analytics"]')
    const textarea = page.locator('textarea')

    await expect(pageIdInput).toHaveValue(/tool-analytics|tool-analytics/)
    await expect(pageTitleInput).toHaveValue(/Tool Analytics/)
    await expect(textarea).not.toBeEmpty()
  })

  test('shows manage tab placeholder', async ({ page }) => {
    await page.goto(`${BASE}/echo-studio`)
    await page.waitForTimeout(2000)

    // Click Manage tab
    await page.locator('button').filter({ hasText: 'manage' }).click()
    await page.waitForTimeout(300)

    await expect(page.locator('text=No screens created yet')).toBeVisible()
  })

  test('shows theme tab placeholder', async ({ page }) => {
    await page.goto(`${BASE}/echo-studio`)
    await page.waitForTimeout(2000)

    // Click Theme tab
    await page.locator('button').filter({ hasText: 'theme' }).click()
    await page.waitForTimeout(300)

    await expect(page.locator('text=Theme customization coming soon')).toBeVisible()
  })

  test('creates a page with the form', async ({ page }) => {
    await page.goto(`${BASE}/echo-studio`)
    await page.waitForTimeout(2000)

    // Fill form
    await page.locator('input[placeholder*="tool-analytics"]').fill('test-page')
    await page.locator('input[placeholder*="Tool Analytics"]').fill('Test Page')
    await page.locator('textarea').fill('A test dashboard with KPI cards and a table.')

    // Click create
    await page.locator('button').filter({ hasText: 'Create Full Page' }).click()
    await page.waitForTimeout(2500)

    // Stats should now show 1 screen created and 1 API endpoint
    await expect(page.locator('text=Screens Created').locator('..').locator('text=1')).toBeVisible()
    await expect(page.locator('text=API Endpoints').locator('..').locator('text=1')).toBeVisible()
  })

  test('no horizontal overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto(`${BASE}/echo-studio`)
    await page.waitForTimeout(2000)

    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(hasOverflow).toBe(false)
  })
})