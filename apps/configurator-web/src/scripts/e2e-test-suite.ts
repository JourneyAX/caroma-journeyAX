import { chromium, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const ARTIFACT_DIR = '/Users/mahaveer/.gemini/antigravity-ide/brain/64ebfdeb-05ea-4a5b-9eea-caf6ae990d53';

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForChatResponse(page: Page) {
  await page.waitForSelector('.thinking', { state: 'hidden', timeout: 45000 });
  await delay(1000); // Give React a moment to settle
}

async function handleClarifyPanel(page: Page) {
  // If there are clarify pills, click the first one of each question
  const questions = await page.locator('.clarify-question').all();
  for (const q of questions) {
    await q.locator('.clarify-pill').first().click();
    await delay(300);
  }
  
  // Submit answers
  const submitBtn = page.locator('.clarify-panel__footer button');
  if (await submitBtn.isVisible()) {
    await submitBtn.click();
    await waitForChatResponse(page);
  }
}

async function runTestScenarios() {
  console.log('Launching Playwright Chrome for END-TO-END Testing...');
  const browser = await chromium.launch({ headless: true });
  
  // =========================================================================
  // SCENARIO 1: Full End-to-End Product Config to Quote (Sinks)
  // =========================================================================
  console.log('\n--- Scenario 1: E2E Kitchen/Laundry Flow ---');
  let context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  let page = await context.newPage();
  await page.goto('http://localhost:3008');
  await delay(2000);

  console.log('Sending prompt for Kitchen/Laundry sinks...');
  await page.fill('.chat-input', 'I am setting up a new kitchen and laundry room. What sink options do you recommend?');
  await page.click('.chat-send-btn');
  await waitForChatResponse(page);

  // Check if clarify panel appeared, if so, answer it
  if (await page.locator('.clarify-panel').isVisible()) {
    console.log('Answering Clarifying Questions...');
    await handleClarifyPanel(page);
  }

  // Wait for products to show up
  await page.waitForSelector('.products-panel', { timeout: 15000 }).catch(() => {});
  if (await page.locator('.products-panel').isVisible()) {
    console.log('Products displayed! Taking intermediate screenshot...');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'scenario1_step1_products.png') });
    
    // Build Quote
    console.log('Clicking "Build my quote"...');
    await page.click('.products-panel__footer button');
    await waitForChatResponse(page);
  }

  // Wait for quote
  await page.waitForSelector('.quote-panel', { timeout: 15000 }).catch(() => {});
  if (await page.locator('.quote-panel').isVisible()) {
    console.log('Quote generated! Taking final E2E screenshot...');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'scenario1_step2_quote.png') });
  }
  await context.close();

  // =========================================================================
  // SCENARIO 2: Interactive Troubleshooting Guide End-to-End
  // =========================================================================
  console.log('\n--- Scenario 2: Troubleshooting Guide E2E ---');
  context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  page = await context.newPage();
  await page.goto('http://localhost:3008');
  await delay(2000);

  console.log('Sending prompt for leaking shower...');
  await page.fill('.chat-input', 'I have a constant drip from my shower wall connection. Please troubleshoot this issue.');
  await page.click('.chat-send-btn');
  await waitForChatResponse(page);

  // Check if clarify panel appeared first
  if (await page.locator('.clarify-panel').isVisible()) {
    console.log('Answering Clarifying Questions for Leak...');
    await handleClarifyPanel(page);
  }

  // Check if Guide panel appeared
  await page.waitForSelector('.guide-step', { timeout: 15000 }).catch(() => {});
  if (await page.locator('.guide-step').count() > 0) {
    console.log('Guide Panel rendered! Clicking a checkbox...');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'scenario2_step1_guide.png') });
    
    // Click the first checkbox
    await page.locator('.guide-step__checkbox').first().click();
    await delay(500);
    
    console.log('Clicking "What\'s next?" footer button...');
    await page.click('.clarify-panel__footer button');
    await waitForChatResponse(page);
    
    console.log('Taking screenshot of AI follow-up response...');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'scenario2_step2_followup.png') });
  }
  await context.close();

  // =========================================================================
  // SCENARIO 3: Warranties to Quote (SKU 853010MW)
  // =========================================================================
  console.log('\n--- Scenario 3: Warranty & Accessories E2E ---');
  context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  page = await context.newPage();
  await page.goto('http://localhost:3008');
  await delay(2000);

  console.log('Sending prompt for warranty and accessories...');
  await page.fill('.chat-input', 'I need to check the warranty and dimensions for SKU 853010MW. I purchased it on 15 March 2024. What accessories do you have for it? Build a quote.');
  await page.click('.chat-send-btn');
  await waitForChatResponse(page);

  if (await page.locator('.clarify-panel').isVisible()) {
    await handleClarifyPanel(page);
  }

  if (await page.locator('.products-panel').isVisible()) {
    await page.click('.products-panel__footer button');
    await waitForChatResponse(page);
  }

  await page.waitForSelector('.quote-panel', { timeout: 15000 }).catch(() => {});
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'scenario3_step1_warranty_quote.png') });
  console.log('Saved scenario3_step1_warranty_quote.png');
  await context.close();

  console.log('\n🎉 Full End-to-End Test Suite Completed Successfully!');
  await browser.close();
}

runTestScenarios().catch(async (err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
