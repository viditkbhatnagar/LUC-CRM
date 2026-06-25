import { test, expect } from '@playwright/test';

const SHOTS = 'e2e/screenshots';

async function login(page, email = 'admin@learnerseducation.com') {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('http://localhost:4600/');
}

test.describe('LUC CRM · end-to-end', () => {
  test('landing page renders (public)', async ({ page }) => {
    await page.goto('/welcome');
    await expect(page.getByRole('heading', { name: /Built for teams that turn/i })).toBeVisible();
    // scroll through to trigger the scroll-reveal sections, then back to top
    await page.evaluate(async () => {
      await new Promise((res) => {
        let y = 0;
        const step = () => {
          window.scrollBy(0, 700);
          y += 700;
          if (y < document.body.scrollHeight) setTimeout(step, 70);
          else res();
        };
        step();
      });
    });
    await page.waitForTimeout(400);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SHOTS}/00-landing.png`, fullPage: true });
  });

  test('login screen renders and authenticates', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/01-login.png`, fullPage: true });
    await login(page);
    await expect(page.getByRole('heading', { name: /Welcome/ })).toBeVisible();
    // wait for the priority queue to actually load before the screenshot
    await page.locator('.queue .lead-card, .content .empty').first().waitFor({ timeout: 15000 });
    await page.screenshot({ path: `${SHOTS}/02-dashboard.png`, fullPage: true });
  });

  test('navigates all screens via the sidebar', async ({ page }) => {
    await login(page);

    await page.getByRole('link', { name: 'Pipeline' }).click();
    await expect(page.getByRole('heading', { name: 'Pipeline' })).toBeVisible();
    await page.locator('.kcol .lead-card').first().waitFor({ timeout: 15000 }); // board populated
    await page.screenshot({ path: `${SHOTS}/03-pipeline.png`, fullPage: true });

    await page.getByRole('link', { name: 'Dashboards' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboards' })).toBeVisible();
    await page.locator('.recharts-surface').waitFor({ timeout: 15000 }); // funnel chart rendered
    await page.locator('table tbody tr').first().waitFor({ timeout: 15000 }); // tables populated
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SHOTS}/04-reports.png`, fullPage: true });

    await page.getByRole('link', { name: 'Flow Map' }).click();
    await expect(page.getByRole('heading', { name: 'Flow Map' })).toBeVisible();
    await page.getByRole('button', { name: /Qualified/ }).first().click();
    await page.screenshot({ path: `${SHOTS}/05-flow.png`, fullPage: true });

    await page.getByRole('link', { name: 'Automation' }).click();
    await expect(page.getByRole('heading', { name: 'Automation Matrix' })).toBeVisible();
    await expect(page.getByText('Offer sent')).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/06-automation.png`, fullPage: true });
  });

  test('opens a seeded lead workspace with control deck + rail', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: 'Pipeline' }).click();
    // open the first lead card
    await page.locator('.lead-card').first().click();
    await expect(page.getByRole('heading', { name: 'Decision & transitions' })).toBeVisible();
    await expect(page.getByText(/Stage \d+\/13|Exited @/)).toBeVisible();
    await expect(page.locator('.rail')).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/07-workspace.png`, fullPage: true });
  });

  test('captures a new lead and lands on its workspace', async ({ page }) => {
    await login(page, 'sara@learnerseducation.com');
    await page.getByRole('link', { name: 'New Lead' }).click();
    await expect(page.getByRole('heading', { name: 'Lead details' })).toBeVisible();
    const stamp = Date.now();
    await page.getByLabel('Name *').fill('E2E Prospect');
    await page.getByLabel('Email *').fill(`e2e.${stamp}@example.com`);
    await page.getByLabel('Phone *').fill(`+97150${stamp.toString().slice(-7)}`);
    await page.getByLabel('Program *').selectOption('Online MBA');
    await page.getByLabel('Source *').selectOption('Referral');
    await page.screenshot({ path: `${SHOTS}/08-capture.png`, fullPage: true });
    await page.getByRole('button', { name: 'Create opportunity' }).click();
    await expect(page).toHaveURL(/\/leads\/[a-f0-9]{24}/);
    await expect(page.getByText('E2E Prospect')).toBeVisible();
  });
});
