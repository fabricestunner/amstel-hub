import { expect, test } from '@playwright/test';

test.describe('Landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads successfully', async ({ page }) => {
    await expect(page).toHaveURL('/');
    await expect(page.locator('header')).toBeVisible();
  });

  test('shows Amstel branding in header', async ({ page }) => {
    const header = page.locator('header');
    await expect(header).toContainText('AMSTEL');
  });

  test('shows Sign in and Get Started buttons', async ({ page }) => {
    await expect(page.locator('header').getByRole('link', { name: /sign in/i })).toBeVisible();
    await expect(page.locator('header').getByRole('link', { name: /get started/i })).toBeVisible();
  });

  test('shows 3 role entry cards', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Customer App' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Outlet Dashboard' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Admin Console' })).toBeVisible();
  });

  test('shows How it works section', async ({ page }) => {
    await expect(page.getByText(/how it works/i)).toBeVisible();
  });

  test('footer is present', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('Amstel');
  });

  test('Customer App card links to /customer', async ({ page }) => {
    const card = page.getByRole('link').filter({ has: page.getByRole('heading', { name: 'Customer App' }) });
    await expect(card).toHaveAttribute('href', '/customer');
  });

  test('Outlet Dashboard card links to /outlet', async ({ page }) => {
    const card = page.getByRole('link').filter({ has: page.getByRole('heading', { name: 'Outlet Dashboard' }) });
    await expect(card).toHaveAttribute('href', '/outlet');
  });

  test('Admin Console card links to /admin', async ({ page }) => {
    const card = page.getByRole('link').filter({ has: page.getByRole('heading', { name: 'Admin Console' }) });
    await expect(card).toHaveAttribute('href', '/admin');
  });
});
