const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:3008');
  await page.fill('.chat-input', 'I have a constant drip from my shower wall connection. Please troubleshoot this issue.');
  await page.click('.chat-send-btn');
  await page.waitForTimeout(10000); // Wait 10s for AI to stream response
  await page.screenshot({ path: '/Users/mahaveer/.gemini/antigravity-ide/brain/64ebfdeb-05ea-4a5b-9eea-caf6ae990d53/scenario2_manual.png' });
  await browser.close();
})();
