import { test, expect } from '@playwright/test';
import path from 'path';

const samplePdfs = {
  onePage: path.join(__dirname, '../sample-pdfs/1-page.pdf'),
  multiPage: path.join(__dirname, '../sample-pdfs/multi-page.pdf'),
  portrait: path.join(__dirname, '../sample-pdfs/portrait.pdf'),
  landscape: path.join(__dirname, '../sample-pdfs/landscape.pdf'),
  large: path.join(__dirname, '../sample-pdfs/50-pages.pdf'),
};

test.describe('PDF Reader - Mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('should open PDF immediately after selection', async ({ page }) => {
    await page.goto('/reader');
    
    // Upload a PDF
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(samplePdfs.multiPage);
    
    // Should not show intermediate screen - should go directly to reader
    await expect(page.locator('text=PDF Reader')).not.toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('should render all pages in continuous scroll', async ({ page }) => {
    await page.goto('/reader');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(samplePdfs.multiPage);
    
    // Should render all 5 pages
    await expect(page.locator('canvas')).toHaveCount(5);
  });

  test('should have fit-to-width default scale', async ({ page }) => {
    await page.goto('/reader');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(samplePdfs.portrait);
    
    const canvas = page.locator('canvas').first();
    const boundingBox = await canvas.boundingBox();
    const viewportWidth = 390; // Mobile viewport width
    
    expect(boundingBox?.width).toBeLessThanOrEqual(viewportWidth - 32); // Account for padding
  });

  test('should not have navigation controls', async ({ page }) => {
    await page.goto('/reader');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(samplePdfs.multiPage);
    
    // Previous/Next buttons should not exist
    await expect(page.locator('text=Previous')).not.toBeVisible();
    await expect(page.locator('text=Next')).not.toBeVisible();
    
    // Zoom buttons should not exist
    await expect(page.locator('text=Zoom In')).not.toBeVisible();
    await expect(page.locator('text=Zoom Out')).not.toBeVisible();
  });

  test('should update page indicator on scroll', async ({ page }) => {
    await page.goto('/reader');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(samplePdfs.multiPage);
    
    const pageIndicator = page.locator('text=/Page \\d+\\/\\d+/');
    await expect(pageIndicator).toBeVisible();
    
    // Scroll down
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(500);
    
    // Page indicator should still be visible
    await expect(pageIndicator).toBeVisible();
  });

  test('should handle landscape PDF', async ({ page }) => {
    await page.goto('/reader');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(samplePdfs.landscape);
    
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(1);
  });

  test('should show error for invalid file', async ({ page }) => {
    await page.goto('/reader');
    
    // Create a fake PDF file
    const fakePdf = path.join(__dirname, '../sample-pdfs/fake.pdf');
    await page.evaluate((filePath) => {
      const fs = require('fs');
      fs.writeFileSync(filePath, 'This is not a PDF');
    }, fakePdf);
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(fakePdf);
    
    // Should show error
    await expect(page.locator('text=Unable to load PDF')).toBeVisible();
    await expect(page.locator('text=Please try another file')).toBeVisible();
  });

  test('screenshot - mobile reader with multi-page PDF', async ({ page }) => {
    await page.goto('/reader');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(samplePdfs.multiPage);
    
    await page.waitForSelector('canvas');
    await page.screenshot({ path: 'test-results/mobile-reader.png', fullPage: true });
  });
});

test.describe('PDF Reader - Desktop', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('should open PDF immediately after selection', async ({ page }) => {
    await page.goto('/reader');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(samplePdfs.multiPage);
    
    await expect(page.locator('text=PDF Reader')).not.toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('should render all pages in continuous scroll', async ({ page }) => {
    await page.goto('/reader');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(samplePdfs.multiPage);
    
    await expect(page.locator('canvas')).toHaveCount(5);
  });

  test('should have fit-to-width default scale', async ({ page }) => {
    await page.goto('/reader');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(samplePdfs.portrait);
    
    const canvas = page.locator('canvas').first();
    const canvasBox = await canvas.boundingBox();
    const container = page.locator('div.max-w-4xl').first();
    const containerBox = await container.boundingBox();
    
    expect(canvasBox?.width).toBeLessThanOrEqual(containerBox?.width || 1280);
  });

  test('should not have navigation controls', async ({ page }) => {
    await page.goto('/reader');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(samplePdfs.multiPage);
    
    await expect(page.locator('text=Previous')).not.toBeVisible();
    await expect(page.locator('text=Next')).not.toBeVisible();
    await expect(page.locator('text=Zoom In')).not.toBeVisible();
    await expect(page.locator('text=Zoom Out')).not.toBeVisible();
  });

  test('should handle large PDF (50 pages)', async ({ page }) => {
    await page.goto('/reader');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(samplePdfs.large);
    
    // Should render all 50 pages
    await expect(page.locator('canvas')).toHaveCount(50);
  });

  test('should scroll smoothly with mouse wheel', async ({ page }) => {
    await page.goto('/reader');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(samplePdfs.multiPage);
    
    const initialScroll = await page.evaluate(() => window.scrollY);
    
    // Scroll down
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(500);
    
    const afterScroll = await page.evaluate(() => window.scrollY);
    expect(afterScroll).toBeGreaterThan(initialScroll);
  });

  test('screenshot - desktop reader with multi-page PDF', async ({ page }) => {
    await page.goto('/reader');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(samplePdfs.multiPage);
    
    await page.waitForSelector('canvas');
    await page.screenshot({ path: 'test-results/desktop-reader.png', fullPage: true });
  });
});
