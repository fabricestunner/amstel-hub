import { expect, test } from '@playwright/test';

test.describe('Protected route redirects (unauthenticated)', () => {
  test('visiting /admin redirects to /login', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('visiting /customer redirects to /login', async ({ page }) => {
    await page.goto('/customer');
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('visiting /outlet redirects to /login', async ({ page }) => {
    await page.goto('/outlet');
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Public routes are accessible', () => {
  test('/ is accessible without auth', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.status()).toBeLessThan(400);
  });

  test('/login is accessible without auth', async ({ page }) => {
    const res = await page.goto('/login');
    expect(res?.status()).toBeLessThan(400);
  });

  test('/register is accessible without auth', async ({ page }) => {
    const res = await page.goto('/register');
    expect(res?.status()).toBeLessThan(400);
  });

  test('/forgot-password is accessible without auth', async ({ page }) => {
    const res = await page.goto('/forgot-password');
    expect(res?.status()).toBeLessThan(400);
  });
});
