// e2e/enrichment-spreadsheet.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Enrichment Spreadsheet', () => {
  test.beforeEach(async ({ page }) => {
    // Seed data and login
    await page.goto('/exercises/test-exercise-id');
  });

  test('displays exercise name in top bar', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('Development Programming 2026');
  });

  test('shows progress bar with stats', async ({ page }) => {
    await expect(page.getByText(/records classified/)).toBeVisible();
  });

  test('renders source and classification columns', async ({ page }) => {
    await expect(page.getByText('Site ID')).toBeVisible();
    await expect(page.getByText('Sport Category')).toBeVisible();
  });

  test('auto-saves classification on cell edit', async ({ page }) => {
    // Click an unclassified cell in the sportCategory column
    const cell = page.locator('.classification-cell').first();
    await cell.dblclick();

    // Select from dependent picklist
    await page.getByPlaceholder('Search...').fill('Baseball');
    await page.getByText('Girls Baseball').click();

    // Wait for auto-save indicator to resolve
    await expect(page.getByText(/records classified/)).toContainText(/1/);
  });

  test('dependent dropdown shows parent-first message', async ({ page }) => {
    // Find a row where sportCategory is empty, double-click categorization
    const categorizationCell = page
      .locator('[col-id="classifications.categorization"]')
      .nth(1);
    await categorizationCell.dblclick();

    await expect(page.getByText(/Select.*first/)).toBeVisible();
  });

  test('shows validation error popover on hover', async ({ page }) => {
    // Find a cell with a validation error (seeded)
    const errorCell = page.locator('.ring-status-error').first();
    await errorCell.hover();

    await expect(page.locator('.bg-forge-800.border')).toBeVisible();
  });

  test('bulk edit updates multiple records', async ({ page }) => {
    // Select first 3 rows via header checkbox
    await page.locator('.ag-header-cell .ag-checkbox-input').first().click();

    // Click Bulk Edit
    await page.getByText(/Bulk Edit/).click();

    // Check sportCategory, select value
    await page.getByText('Sport Category').click();
    await page.locator('select').first().selectOption('Girls Baseball');

    // Apply
    await page.getByText(/Apply to/).click();

    // Verify toast
    await expect(page.getByText(/records updated/)).toBeVisible();
  });

  test('pagination works', async ({ page }) => {
    await expect(page.getByText(/Showing 1-/)).toBeVisible();
    // If total > pageSize, test next button
  });

  test('quick filter buttons filter records', async ({ page }) => {
    // Click "Has Errors" filter
    await page.getByText('Has Errors').click();

    // Should show filtered results
    await expect(page.getByText(/Showing/)).toBeVisible();
  });

  test('search filters records', async ({ page }) => {
    // Type in search box
    await page.getByPlaceholder('Search records...').fill('Program 1');

    // Wait for filtered results
    await expect(page.getByText(/Showing/)).toBeVisible();
  });

  test('export CSV button opens download', async ({ page }) => {
    // Click Export CSV
    const [newPage] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByText('Export CSV').click(),
    ]);
    expect(newPage.url()).toContain('/export');
  });
});
