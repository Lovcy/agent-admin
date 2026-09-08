import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/projects');
  await page.getByRole('textbox', { name: '账号', exact: true }).fill('admin');
  await page.getByRole('textbox', { name: '密码', exact: true }).fill('admin123');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByText('客户服务平台', { exact: true })).toBeVisible();
}

test('@smoke login guard, filter, clear and logout', async ({ page }) => {
  await login(page);
  const search = page.getByRole('textbox', { name: '搜索项目' });
  await search.fill('陈晓');
  await expect(page.locator('.el-table__body-wrapper tbody tr')).toHaveCount(1);
  await search.fill('不存在的项目');
  await expect(page.getByText('没有符合条件的项目')).toBeVisible();
  await search.fill('');
  await expect(page.locator('.el-table__body-wrapper tbody tr')).toHaveCount(6);
  await page.getByRole('button', { name: '退出登录' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/files');
  await expect(page).toHaveURL(/\/login/);
});

test('invalid login stays unauthenticated', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('textbox', { name: '账号', exact: true }).fill('admin');
  await page.getByRole('textbox', { name: '密码', exact: true }).fill('wrong');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('@smoke creates a project with validation', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: '新建项目' }).click();
  await page.getByRole('button', { name: '创建项目', exact: true }).click();
  await expect(page.getByText('项目名称需为 2 至 40 个字符')).toBeVisible();
  await page.getByRole('textbox', { name: '项目名称', exact: true }).fill('测试项目');
  await page.getByRole('textbox', { name: '负责人', exact: true }).fill('测试员');
  await page.getByRole('button', { name: '创建项目', exact: true }).click();
  await expect(page.getByText('测试项目', { exact: true })).toBeVisible();
});

test('@smoke uploads a file and reports invalid empty input', async ({ page }) => {
  await login(page);
  await page.getByRole('navigation').getByRole('link', { name: '文件中心' }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'report.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('test upload'),
  });
  await expect(page.getByText('report.txt', { exact: true })).toBeVisible();
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'empty.txt', mimeType: 'text/plain', buffer: Buffer.alloc(0) });
  await expect(page.getByText('不能上传空文件')).toBeVisible();
});

test('theme persists and tabs can close', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: '切换主题' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('navigation').getByRole('link', { name: '文件中心' }).click();
  await page.getByRole('button', { name: '关闭文件中心' }).click();
  await expect(page).toHaveURL(/\/projects$/);
});

test('mobile layout has working navigation and no page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await expect(page.getByRole('heading', { name: '项目管理' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: '打开导航' }).click();
  await page.getByRole('navigation').getByRole('link', { name: '文件中心' }).click();
  await expect(page.getByRole('heading', { name: '文件中心' })).toBeVisible();
});

test('expired sessions return to login and unknown pages offer recovery', async ({ page }) => {
  await login(page);
  await page.evaluate(() =>
    sessionStorage.setItem('agent-admin.session', JSON.stringify({ token: 'expired', name: 'User' })),
  );
  await page.reload();
  await expect(page).toHaveURL(/\/login/);
  await page.getByRole('textbox', { name: '账号', exact: true }).fill('admin');
  await page.getByRole('textbox', { name: '密码', exact: true }).fill('admin123');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await page.goto('/missing');
  await expect(page.getByText('页面不存在', { exact: true }).last()).toBeVisible();
});
