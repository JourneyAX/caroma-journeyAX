const { chromium } = require('playwright');
const path = require('path');
const ARTIFACT_DIR = '/Users/mahaveer/.gemini/antigravity-ide/brain/64ebfdeb-05ea-4a5b-9eea-caf6ae990d53';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForChatResponse(page) {
  await page.waitForSelector('.thinking', { state: 'hidden', timeout: 45000 });
  await delay(1000);
}

(async () => {
  console.log('Launching Inspiration Flow Test...');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:3008');
  await delay(2000);

  console.log('Sending prompt...');
  await page.fill('.chat-input', "I'm building new — spec a full bathroom with matching finishes.");
  await page.click('.chat-send-btn');
  await waitForChatResponse(page);

  // Answer clarify panel
  console.log('Answering Clarify Panel...');
  const questions = await page.locator('.clarify-question').all();
  for (const q of questions) {
    await q.locator('.clarify-pill').first().click();
    await delay(300);
  }
  await page.click('.clarify-panel__footer button');
  await waitForChatResponse(page);

  // Wait for products to load (this is what failed before!)
  console.log('Waiting for Product Bundle...');
  await page.waitForSelector('.products-panel', { timeout: 15000 }).catch(() => {});
  if (await page.locator('.products-panel').isVisible()) {
    console.log('Products displayed! Taking screenshot...');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'inspiration_products.png') });
    
    // Build Quote
    console.log('Clicking Build Quote...');
    await page.click('.products-panel__footer button');
    await waitForChatResponse(page);
    
    console.log('Quote generated! Taking screenshot...');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'inspiration_quote.png') });
  } else {
    console.log('Failed to show products panel! Taking error screenshot...');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'inspiration_failed.png') });
  }

  await browser.close();
  console.log('Done!');
})();
