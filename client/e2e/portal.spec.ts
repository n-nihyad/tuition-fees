import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const jwt = (expires = Date.now() + 3_600_000) => `test.${Buffer.from(JSON.stringify({ sub: 'qa-user', exp: Math.floor(expires / 1000) })).toString('base64url')}.signature`
const id = '11111111-1111-4111-8111-111111111111'
const feeId = '22222222-2222-4222-8222-222222222222'
const feeName = 'Học phí học kỳ mùa thu chương trình đào tạo quốc tế chất lượng cao 2026–2027'
const payment = () => ({ id, tuitionFeeId: feeId, feeName, studentId: 'SV202600123', studentName: 'Nguyễn Thị Minh Anh', amount: '850000.00', status: 'pending_otp', otpExpiresAt: new Date(Date.now() + 300_000).toISOString(), createdAt: new Date().toISOString(), completedAt: null, balanceBefore: null, idempotencyKey: 'qa-intent', termsAcceptedAt: new Date().toISOString() })

async function mockApi(page: Page) {
  let current = payment()
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    if (!path.startsWith('/api/')) return route.continue()
    if (path.endsWith('/auth/login')) return route.fulfill({ json: { accessToken: jwt(), refreshToken: 'unused', expiresIn: 3600, role: 'student' } })
    if (path.endsWith('/auth/logout')) return route.fulfill({ status: 204 })
    if (path.includes('/users/')) return route.fulfill({ json: { id: 'qa-user', mssv: 'SV202600123', fullName: 'Nguyễn Thị Minh Anh', email: 'minhanh.qa@example.test', phone: '0900000000', role: 'student' } })
    if (path === '/api/wallet') return route.fulfill({ json: { availableBalance: '123456789012.00' } })
    if (path.startsWith('/api/tuition/fees/')) return route.fulfill({ json: { studentId: 'SV202600123', studentName: current.studentName, amount: current.amount, isPaid: false, tuitionFeeId: feeId, name: feeName, fees: [{ id: feeId, name: feeName, amount: current.amount, status: 'unpaid' }] } })
    if (path === '/api/payments' && request.method() === 'POST') {
      current = { ...payment(), idempotencyKey: request.postDataJSON().idempotencyKey }
      return route.fulfill({ status: 201, json: current })
    }
    if (path.endsWith('/confirm')) return route.fulfill({ status: 400, headers: { 'x-otp-attempts-remaining': '4' }, json: { detail: 'OTP không hợp lệ hoặc đã hết hạn.' } })
    if (path === '/api/payments') return route.fulfill({ json: { items: [current], total: 1, statusCounts: { pending_otp: 1, succeeded: 0, failed: 0, expired: 0 } } })
    return route.fulfill({ status: 404, json: { detail: `Unexpected QA request: ${path}` } })
  })
}

async function signIn(page: Page) {
  await page.addInitScript((token) => { sessionStorage.setItem('accessToken', token); localStorage.setItem('locale', 'vi') }, jwt())
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
}

async function startPayment(page: Page) {
  await page.goto('/payment')
  await page.getByLabel('Mã số sinh viên', { exact: true }).fill('SV202600123')
  await page.getByRole('button', { name: 'Tra cứu', exact: true }).click()
  await expect(page.getByText(feeName, { exact: true }).first()).toBeVisible()
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Xác thực thanh toán' })).toBeVisible()
}

for (const width of [360, 390, 1280]) {
  test(`layout and accessibility at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 820 })
    await mockApi(page)
    await page.goto('/login')
    await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeVisible()
    await noOverflow(page)
    const loginA11y = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    expect(loginA11y.violations).toEqual([])
    await page.getByLabel('Tên đăng nhập', { exact: true }).fill('qa')
    await page.getByLabel('Mật khẩu', { exact: true }).fill('test-only')
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
    await expect(page).toHaveURL(/dashboard/)
    await expect(page.getByText('Giao dịch gần đây', { exact: true })).toBeVisible()
    await noOverflow(page)
    const dashboardA11y = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    expect(dashboardA11y.violations).toEqual([])
    await page.screenshot({ path: testInfo.outputPath('dashboard.png'), fullPage: true })
    for (const path of ['/history', '/payment']) {
      await page.goto(path)
      await expect(page.locator('#portal-content')).toBeVisible()
      await page.getByRole('heading', { name: /Không thể tải/ }).count().then((count) => expect(count).toBe(0))
      await noOverflow(page)
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
      expect(results.violations).toEqual([])
      await page.screenshot({ path: testInfo.outputPath(`${path.slice(1)}.png`), fullPage: true })
    }
    await startPayment(page)
    await noOverflow(page)
    const otpA11y = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    expect(otpA11y.violations).toEqual([])
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: testInfo.outputPath('otp.png'), fullPage: true })
  })
}

test('pending payment survives reload without persisting the OTP', async ({ page }) => {
  await mockApi(page); await signIn(page)
  await startPayment(page)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Xác thực thanh toán' })).toBeVisible()
  expect(await page.locator('.ant-otp input').evaluateAll((inputs) => inputs.every((input) => !(input as HTMLInputElement).value))).toBe(true)
})

test('slow create + double click creates one request, and retry keeps the key', async ({ page }) => {
  await mockApi(page); await signIn(page)
  const keys: string[] = []
  await page.route('**/api/payments', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    keys.push(route.request().postDataJSON().idempotencyKey)
    await new Promise((resolve) => setTimeout(resolve, 650))
    return route.fulfill({ status: 503, json: { detail: 'Kết nối tạm thời gián đoạn.' } })
  })
  await page.goto('/payment')
  await page.getByLabel('Mã số sinh viên', { exact: true }).fill('SV202600123')
  await page.getByRole('button', { name: 'Tra cứu', exact: true }).click()
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).dblclick()
  await expect(page.getByText('Kết nối tạm thời gián đoạn.', { exact: true })).toBeVisible()
  expect(keys).toHaveLength(1)
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click()
  await expect.poll(() => keys.length).toBe(2)
  expect(keys[0]).toBe(keys[1])
})

test('401 returns to login after the configured grace period', async ({ page }) => {
  await mockApi(page); await signIn(page)
  await page.route('**/api/wallet', (route) => route.fulfill({ status: 401, json: { detail: 'Token đã hết hạn.' } }))
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/login/, { timeout: 5000 })
  expect(await page.evaluate(() => sessionStorage.getItem('accessToken'))).toBeNull()
})

test('double confirmation uses one OTP submission and shows one inline error', async ({ page }) => {
  await mockApi(page); await signIn(page)
  await startPayment(page)
  let count = 0
  await page.route('**/api/payments/*/confirm', async (route) => {
    count += 1
    await new Promise((resolve) => setTimeout(resolve, 400))
    await route.fulfill({ status: 400, headers: { 'x-otp-attempts-remaining': '4' }, json: { detail: 'OTP không hợp lệ hoặc đã hết hạn.' } })
  })
  await page.locator('.ant-otp input').first().pressSequentially('123456')
  await page.getByRole('button', { name: 'Xác nhận thanh toán', exact: true }).dblclick()
  await expect(page.getByText('Còn 4 lần gửi mã.', { exact: true })).toBeVisible()
  expect(count).toBe(1)
  await expect(page.locator('#otp-feedback-message')).toBeVisible()
  await expect(page.locator('.ant-alert-error')).toHaveCount(0)
})

test('late confirmation after logout cannot restore the old payment', async ({ page }) => {
  await mockApi(page); await signIn(page)
  await startPayment(page)
  let release: (() => void) | undefined
  let finished: (() => void) | undefined
  const delivered = new Promise<void>((resolve) => { finished = resolve })
  await page.route('**/api/payments/*/confirm', async (route) => {
    await new Promise<void>((resolve) => { release = resolve })
    await route.fulfill({ json: { ...payment(), status: 'succeeded', completedAt: new Date().toISOString(), balanceBefore: '123456789012.00' } })
    finished?.()
  })
  await page.locator('.ant-otp input').first().pressSequentially('123456')
  await page.getByRole('button', { name: 'Xác nhận thanh toán', exact: true }).click()
  await expect.poll(() => Boolean(release)).toBe(true)
  await page.getByRole('button', { name: 'Tài khoản', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Đăng xuất', exact: true }).click()
  await expect(page).toHaveURL(/login/)
  release?.()
  await delivered
  await page.getByLabel('Tên đăng nhập', { exact: true }).fill('another-user')
  await page.getByLabel('Mật khẩu', { exact: true }).fill('test-only')
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page).toHaveURL(/dashboard/)
  expect(await page.evaluate(() => sessionStorage.getItem('pendingPaymentId'))).toBeNull()
})

test('OTP remains reachable in a small viewport while typing', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 820 })
  await mockApi(page); await signIn(page)
  await startPayment(page)
  await page.setViewportSize({ width: 390, height: 420 })
  const otp = page.locator('.ant-otp input').first()
  await otp.focus()
  await otp.scrollIntoViewIfNeeded()
  await otp.pressSequentially('123456')
  await noOverflow(page)
  await expect(page.getByRole('button', { name: 'Xác nhận thanh toán', exact: true })).toBeEnabled()
  await page.screenshot({ path: testInfo.outputPath('small-viewport-otp.png') })
})

test('keyboard navigation focuses content and skip link works', async ({ page }) => {
  await mockApi(page); await signIn(page)
  await page.goto('/dashboard')
  await expect(page.locator('#portal-content')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Thanh toán', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/payment/)
  await expect(page.locator('#portal-content')).toBeFocused()
  await page.reload()
  await page.locator('body').click({ position: { x: 1, y: 1 } })
  await page.keyboard.press('Control+Home')
  await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur() })
  await page.keyboard.press('Tab')
  // The visible skip link can always be reached without traversing the menu.
  await page.getByRole('link', { name: 'Đến nội dung chính' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#portal-content')).toBeFocused()
})

test('login does not request protected pages and a missing chunk has recovery UI', async ({ page }) => {
  await mockApi(page)
  const requested: string[] = []
  page.on('request', (request) => requested.push(new URL(request.url()).pathname))
  await page.goto('/login')
  await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeVisible()
  expect(requested.some((path) => /\/(HistoryPage|PaymentPage|ProtectedLayout)\.tsx$/.test(path))).toBe(false)
  await page.evaluate((token) => sessionStorage.setItem('accessToken', token), jwt())
  await page.route(/\/features\/history\/pages\/HistoryPage\.tsx(?:\?.*)?$/, (route) => route.abort())
  await page.goto('/history')
  await expect(page.getByRole('heading', { name: 'Không thể mở trang' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tải lại trang', exact: true })).toBeVisible()
})

test('tablet navigation stays in one balanced row', async ({ page }, testInfo) => {
  await mockApi(page); await signIn(page)
  for (const width of [768, 820, 1024, 1100]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/dashboard')
    const nav = page.getByRole('navigation', { name: 'Điều hướng chính' })
    const links = nav.locator('.portal-mobile-nav a')
    await expect(links).toHaveCount(3)
    for (const link of await links.all()) await expect(link).toBeVisible()
    const boxes = await links.evaluateAll((items) => items.map((item) => {
      const rect = item.getBoundingClientRect()
      return { top: rect.top, width: rect.width }
    }))
    expect(Math.max(...boxes.map((box) => box.top)) - Math.min(...boxes.map((box) => box.top))).toBeLessThan(1)
    expect(Math.max(...boxes.map((box) => box.width)) - Math.min(...boxes.map((box) => box.width))).toBeLessThan(1)
    await noOverflow(page)
    await page.screenshot({ path: testInfo.outputPath(`tablet-${width}.png`) })
  }
})

test('mobile lookup shows long fee labels and large amounts without clipping', async ({ page }, testInfo) => {
  await mockApi(page); await signIn(page)
  await page.route('**/api/tuition/fees/*', (route) => route.fulfill({ json: {
    studentId: 'SV202600123', studentName: 'Nguyễn Thị Minh Anh', amount: '123456789012.00', isPaid: false,
    tuitionFeeId: feeId, name: feeName, fees: [{ id: feeId, name: feeName, amount: '123456789012.00', status: 'unpaid' }],
  } }))
  for (const width of [360, 390]) {
    await page.setViewportSize({ width, height: 820 })
    await page.goto('/payment')
    await page.getByLabel('Mã số sinh viên', { exact: true }).fill('SV202600123')
    await page.getByRole('button', { name: 'Tra cứu', exact: true }).click()
    const label = page.locator('.fee-select-text')
    await expect(label).toContainText(feeName)
    expect(await label.evaluate((node) => node.scrollWidth <= node.clientWidth + 1 && node.scrollHeight <= node.clientHeight + 1)).toBe(true)
    await page.getByRole('combobox', { name: 'Khoản học phí', exact: true }).click()
    const option = page.locator('.fee-select-option')
    await expect(option).toBeVisible()
    await expect(page.locator('.fee-select-popup')).toBeInViewport()
    await option.hover()
    await noOverflow(page)
    await expect(page.locator('.fee-select-content.ant-select-content-has-value')).toHaveCSS('opacity', '1')
    expect(await option.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true)
    const selectA11y = await new AxeBuilder({ page }).include('.fee-select-root').include('.fee-select-popup').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    expect(selectA11y.violations).toEqual([])
    await page.screenshot({ path: testInfo.outputPath(`lookup-open-${width}.png`), fullPage: true })
    await page.keyboard.press('Escape')
    await page.screenshot({ path: testInfo.outputPath(`lookup-${width}.png`), fullPage: true })
    await noOverflow(page)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: testInfo.outputPath(`lookup-${width}.png`), fullPage: true })
  }
})

test('an existing Vietnamese login error changes to English without resubmitting', async ({ page }) => {
  await mockApi(page)
  let requests = 0
  await page.route('**/api/auth/login', (route) => {
    requests += 1
    return route.fulfill({ status: 401, json: { detail: 'Username hoặc mật khẩu không chính xác.' } })
  })
  await page.goto('/login')
  await page.getByLabel('Tên đăng nhập', { exact: true }).fill('qa')
  await page.getByLabel('Mật khẩu', { exact: true }).fill('incorrect')
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page.getByText('Username hoặc mật khẩu không chính xác.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Chọn ngôn ngữ' }).click()
  await expect(page.getByRole('menu')).toBeInViewport()
  await page.getByRole('menuitem', { name: 'English', exact: true }).click()
  await expect(page.getByText('The username or password is incorrect.', { exact: true })).toBeVisible()
  await expect(page.getByText('Username hoặc mật khẩu không chính xác.', { exact: true })).toHaveCount(0)
  expect(requests).toBe(1)
})

test('lookup errors from a Vietnamese backend render in English', async ({ page }) => {
  await mockApi(page); await signIn(page)
  await page.route('**/api/tuition/fees/*', (route) => route.fulfill({ status: 404, json: { detail: 'Không tìm thấy khoản học phí của MSSV này.' } }))
  await page.goto('/payment')
  await page.getByRole('button', { name: 'Chọn ngôn ngữ' }).click()
  await expect(page.getByRole('menu').last()).toBeInViewport()
  await page.getByRole('menuitem', { name: 'English', exact: true }).click()
  await page.getByLabel('Student ID', { exact: true }).fill('UNKNOWN')
  await page.getByRole('button', { name: 'Look up', exact: true }).click()
  await expect(page.getByText('No tuition fee was found for this student ID.', { exact: true })).toBeVisible()
})
