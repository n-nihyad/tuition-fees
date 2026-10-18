import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import test from 'node:test'
import { AxiosError } from 'axios'

registerHooks({
  resolve(specifier, context, nextResolve) {
    try { return nextResolve(specifier, context) }
    catch (error) {
      if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.')) {
        return nextResolve(`${specifier}.ts`, context)
      }
      throw error
    }
  },
})

const storage = new Map()
Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  value: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  },
})
globalThis.window = new EventTarget()
const { scheduleSessionExpiry, watchTokenExpiry, tokenExpiresAt, SESSION_EXPIRED_EVENT, SESSION_EXPIRY_DELAY_MS } =
  await import('../src/shared/auth/sessionExpiry.ts')
const { http, ApiError } = await import('../src/shared/api/client.ts')

function setup(t) {
  storage.clear()
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 100_000 })
  let events = 0
  const listener = () => { events += 1 }
  window.addEventListener(SESSION_EXPIRED_EVENT, listener)
  t.after(() => {
    storage.clear()
    t.mock.timers.tick(10_000)
    t.mock.timers.reset()
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener)
  })
  return () => events
}

function token(exp) { return `header.${btoa(JSON.stringify({ exp }))}.signature` }

test('idle JWT expiry clears storage and emits sign-out after the configured delay', (t) => {
  const events = setup(t)
  const accessToken = token(110)
  storage.set('accessToken', accessToken)
  const stop = watchTokenExpiry(accessToken)
  t.mock.timers.tick(10_000)
  assert.equal(events(), 0)
  t.mock.timers.tick(SESSION_EXPIRY_DELAY_MS - 1)
  assert.equal(storage.get('accessToken'), accessToken)
  t.mock.timers.tick(1)
  assert.equal(storage.has('accessToken'), false)
  assert.equal(events(), 1)
  stop()
})

test('multiple 401 responses do not restart the first configured countdown', (t) => {
  const events = setup(t)
  storage.set('accessToken', 'current')
  scheduleSessionExpiry('current')
  const halfway = Math.floor(SESSION_EXPIRY_DELAY_MS / 2)
  t.mock.timers.tick(halfway)
  scheduleSessionExpiry('current')
  t.mock.timers.tick(SESSION_EXPIRY_DELAY_MS - halfway - 1)
  assert.equal(events(), 0)
  t.mock.timers.tick(1)
  assert.equal(events(), 1)
})

test('an old request or timer cannot sign out a new login', (t) => {
  const events = setup(t)
  storage.set('accessToken', 'old')
  scheduleSessionExpiry('old')
  storage.set('accessToken', 'new')
  scheduleSessionExpiry('old')
  t.mock.timers.tick(SESSION_EXPIRY_DELAY_MS)
  assert.equal(storage.get('accessToken'), 'new')
  assert.equal(events(), 0)
})

function rejectWith(status) {
  return async (config) => {
    throw new AxiosError('API error', 'ERR_BAD_REQUEST', config, undefined, {
      data: { detail: 'API error' }, status, statusText: 'Error', headers: {}, config,
    })
  }
}

test('401 from profile, wallet or payment schedules the same delayed sign-out', async (t) => {
  const events = setup(t)
  const original = http.defaults.adapter
  http.defaults.adapter = rejectWith(401)
  try {
    let count = 0
    for (const path of ['/api/users/me', '/api/wallet', '/api/payments']) {
      storage.set('accessToken', path)
      await assert.rejects(http.get(path), (error) => error instanceof ApiError && error.status === 401)
      assert.equal(storage.get('accessToken'), path)
      t.mock.timers.tick(SESSION_EXPIRY_DELAY_MS)
      assert.equal(storage.has('accessToken'), false)
      assert.equal(events(), ++count)
    }
  } finally { http.defaults.adapter = original }
})

test('incorrect login credentials do not schedule session expiry', async (t) => {
  const events = setup(t)
  storage.set('accessToken', 'current')
  const original = http.defaults.adapter
  http.defaults.adapter = rejectWith(401)
  try {
    for (const path of ['/api/auth/login', '/api/v1/auth/login']) {
      await assert.rejects(http.post(path, { username: 'demo', password: 'wrong' }))
    }
    t.mock.timers.tick(SESSION_EXPIRY_DELAY_MS)
    assert.equal(storage.get('accessToken'), 'current')
    assert.equal(events(), 0)
  } finally { http.defaults.adapter = original }
})

test('403 and server errors do not log out the current user', async (t) => {
  const events = setup(t)
  storage.set('accessToken', 'current')
  const original = http.defaults.adapter
  try {
    for (const status of [403, 500]) {
      http.defaults.adapter = rejectWith(status)
      await assert.rejects(http.get('/api/payments'))
    }
    t.mock.timers.tick(SESSION_EXPIRY_DELAY_MS)
    assert.equal(storage.get('accessToken'), 'current')
    assert.equal(events(), 0)
  } finally { http.defaults.adapter = original }
})

test('expired tokens at startup also get the configured grace period', (t) => {
  const events = setup(t)
  const accessToken = token(90)
  storage.set('accessToken', accessToken)
  const stop = watchTokenExpiry(accessToken)
  t.mock.timers.tick(SESSION_EXPIRY_DELAY_MS - 1)
  assert.equal(events(), 0)
  t.mock.timers.tick(1)
  assert.equal(events(), 1)
  stop()
})

test('invalid or missing exp claims do not crash the UI', () => {
  for (const value of ['broken', token('wrong'), token(null), token(-1)]) {
    assert.equal(tokenExpiresAt(value), null)
  }
})
