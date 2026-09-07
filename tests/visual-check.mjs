import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(new URL('../templates/admin/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const browser = await chromium.launch({ executablePath: chromium.executablePath() });
const errors = [];
await mkdir('artifacts/preview', { recursive: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(process.argv[2] ?? 'http://127.0.0.1:5173');
  await page.getByRole('textbox', { name: '账号', exact: true }).fill('admin');
  await page.getByRole('textbox', { name: '密码', exact: true }).fill('admin123');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.getByText('客户服务平台', { exact: true }).waitFor();
  await page.screenshot({ path: 'artifacts/preview/desktop.png', fullPage: true });
  await page.getByRole('button', { name: '切换主题' }).click();
  await page.mouse.move(0, 0);
  await page.getByRole('tooltip').waitFor({ state: 'hidden' });
  await page.screenshot({ path: 'artifacts/preview/dark.png', fullPage: true });
  await page.getByRole('button', { name: '切换主题' }).click();
  await page.mouse.move(0, 0);
  await page.getByRole('tooltip').waitFor({ state: 'hidden' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/preview/mobile.png', fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  await writeFile(
    'artifacts/preview/result.json',
    JSON.stringify(
      { screenshots: ['desktop', 'dark', 'mobile'], pageErrors: errors, mobileOverflow: false },
      null,
      2,
    ),
  );
  console.log('Desktop, dark and mobile screenshots saved; no page errors or mobile overflow.');
} finally {
  await browser.close();
}
