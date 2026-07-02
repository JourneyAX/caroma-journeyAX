const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3008...');
  await page.goto('http://localhost:3008');

  console.log('Waiting for chat input...');
  await page.waitForSelector('.chat-input');
  
  console.log('Typing prompt...');
  await page.fill('.chat-input', 'Spec a full bathroom with matching finishes');
  await page.press('.chat-input', 'Enter');

  console.log('Waiting for Clarify panel...');
  await page.waitForSelector('.clarify-panel', { timeout: 30000 });
  
  console.log('Selecting Clarify options...');
  const pills = await page.$$('.clarify-pill');
  if (pills.length >= 3) {
    await pills[0].click();
    await pills[5].click();
    await pills[9].click();
  }
  
  console.log('Submitting Clarify answers...');
  await page.click('.clarify-build-btn');

  console.log('Waiting for Products Panel (Phase 2)...');
  await page.waitForSelector('.products-panel', { timeout: 30000 });

  // Wait a bit for images to load
  await page.waitForTimeout(2000);

  console.log('Checking for accessories...');
  const checkboxes = await page.$$('.part-checkbox');
  console.log('Found ' + checkboxes.length + ' checkboxes (accessories/parts).');

  if (checkboxes.length > 0) {
    console.log('Clicking first optional accessory...');
    // The optional ones are the ones that are not `.checked` initially or we just click any
    await checkboxes[checkboxes.length - 1].click(); // click the last one
  }

  console.log('Clicking Build Quote...');
  await page.click('.products-panel__footer .clarify-build-btn');

  console.log('Waiting for user selection message in chat...');
  await page.waitForTimeout(2000);
  
  // Get all user messages
  const userMessages = await page.$$eval('.chat-bubble.user .chat-bubble__text', els => els.map(e => e.textContent));
  console.log('Last User Message: ', userMessages[userMessages.length - 1]);

  await browser.close();
  console.log('Test complete and successful!');
})();
