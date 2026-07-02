const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating...');
  await page.goto('http://localhost:3008');
  await page.waitForSelector('.chat-input');
  
  console.log('Typing prompt...');
  await page.fill('.chat-input', 'Spec a full bathroom with matching finishes');
  await page.press('.chat-input', 'Enter');

  console.log('Waiting for Clarify panel...');
  await page.waitForSelector('.clarify-panel', { timeout: 30000 });
  
  console.log('Waiting for dynamic questions to load...');
  // Wait until the question options actually appear
  await page.waitForSelector('.clarify-question__options', { timeout: 15000 });
  await page.waitForTimeout(2000); // Give it a sec to fully render
  
  console.log('Selecting one option per question...');
  const questions = await page.$$('.clarify-question__options');
  for (const q of questions) {
    const firstPill = await q.$('.clarify-pill');
    if (firstPill) {
      await firstPill.click();
      await page.waitForTimeout(200);
    }
  }
  
  console.log('Submitting...');
  await page.click('.clarify-build-btn');

  console.log('Waiting for AI recommendation (Products Panel)...');
  await page.waitForSelector('.products-panel', { timeout: 45000 });

  console.log('Waiting for images and rendering...');
  await page.waitForTimeout(6000);

  // Check checkboxes
  const checkboxes = await page.$$('.part-checkbox');
  console.log('Checkboxes rendered: ' + checkboxes.length);

  // Take a full screenshot
  const screenshotPath = '/Users/mahaveer/.gemini/antigravity-ide/brain/64ebfdeb-05ea-4a5b-9eea-caf6ae990d53/products-panel-test.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Screenshot saved to: ' + screenshotPath);

  await browser.close();
})();
