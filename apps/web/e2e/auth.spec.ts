import { expect, test } from '@playwright/test';

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('loads the login page', async ({ page }) => {
    await expect(page.getByText(/sign in/i).first()).toBeVisible();
  });

  test('shows email/phone input', async ({ page }) => {
    await expect(
      page.getByLabel(/email or phone/i).or(page.getByPlaceholder(/email/i))
    ).toBeVisible();
  });

  test('shows password input', async ({ page }) => {
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('shows submit button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /sign in/i })
    ).toBeVisible();
  });

  test('shows link to register page', async ({ page }) => {
    await expect(
      page.getByRole('link', { name: /create an account/i })
    ).toBeVisible();
  });

  test('shows link to forgot password', async ({ page }) => {
    await expect(
      page.getByRole('link', { name: /forgot/i })
    ).toBeVisible();
  });
});

test.describe('Register page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('loads the register page', async ({ page }) => {
    await expect(page.getByText(/register|create account|sign up/i).first()).toBeVisible();
  });

  test('shows name fields', async ({ page }) => {
    await expect(
      page.getByLabel(/first name/i).or(page.getByPlaceholder(/first name/i))
    ).toBeVisible();
  });

  test('shows email field', async ({ page }) => {
    await expect(
      page.getByLabel(/email/i).or(page.getByPlaceholder(/email/i))
    ).toBeVisible();
  });

  test('shows phone field', async ({ page }) => {
    await expect(
      page.getByLabel(/phone/i).or(page.getByPlaceholder(/phone/i))
    ).toBeVisible();
  });

  test('shows password field', async ({ page }) => {
    await expect(page.getByLabel(/password/i).first()).toBeVisible();
  });
});

test.describe('Forgot password page', () => {
  test('loads the forgot password page', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByText(/reset your password/i).first()).toBeVisible();
  });
});
