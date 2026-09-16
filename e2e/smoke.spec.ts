import { expect, test } from '@playwright/test'

test('the server serves the SPA shell', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle('Feedly')
  await expect(page.getByTestId('app-root')).toBeAttached()
})

test('the health endpoint reports the service as up', async ({ request }) => {
  const response = await request.get('/api/health')

  expect(response.status()).toBe(200)
  expect(await response.json()).toMatchObject({ status: 'ok' })
})
