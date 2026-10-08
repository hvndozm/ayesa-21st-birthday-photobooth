import assert from 'node:assert/strict'
import test from 'node:test'
import { sendBirthdayMessage, BirthdayMessageError } from '../src/services/birthdayMessageService.js'
import { validateBirthdayMessage } from '../src/utils/birthdayMessageValidation.js'

const userId = '10000000-0000-4000-8000-000000000001'
const example = { nickname: 'Test Friend', message: 'Happy 21st birthday, Ayesa! I hope you have the loveliest day. ♡' }

function fakeClient({ anonymous = true, sessionExists = true, insert, sessionError, signIn } = {}) {
  const calls = { sessions: 0, signIns: 0, rows: [], signals: [] }
  let session = sessionExists ? { user: { id: userId, is_anonymous: anonymous } } : null
  const client = {
    auth: {
      async getSession() { calls.sessions += 1; return { data: { session }, error: sessionError ?? null } },
      async signInAnonymously() {
        calls.signIns += 1
        const response = signIn ? await signIn() : { data: { session: { user: { id: userId, is_anonymous: true } } }, error: null }
        if (response.data?.session) session = response.data.session
        return response
      },
    },
    from(table) {
      assert.equal(table, 'birthday_messages')
      return {
        insert(row) {
          calls.rows.push(row)
          return {
            select() { assert.fail('INSERT-only guests must never request message SELECT') },
            abortSignal(signal) {
              calls.signals.push(signal)
              return insert ? insert(signal) : Promise.resolve({ data: null, error: null, status: 201 })
            },
          }
        },
      }
    },
  }
  return { client, calls }
}

test('blank and whitespace-only nicknames/messages produce friendly associated errors', () => {
  for (const input of [undefined, null, {}, { nickname: '', message: '' },
    { nickname: ' \n\t ', message: ' \r\n ' }, { nickname: {}, message: [] }]) {
    const { errors } = validateBirthdayMessage(input)
    assert.match(errors.nickname, /nickname/)
    assert.match(errors.message, /message/)
  }
  assert.deepEqual(validateBirthdayMessage(example).errors, {})
})

test('trimmed limits allow 40/2000 and near-limit text, but reject 41/2001', () => {
  for (const size of [1999, 2000]) {
    const { errors, values } = validateBirthdayMessage({ nickname: '  ' + 'N'.repeat(40) + '  ', message: ' \n' + 'M'.repeat(size) + '\n ' })
    assert.deepEqual(errors, {})
    assert.equal(values.nickname.length, 40)
    assert.equal(values.message.length, size)
  }
  const { errors } = validateBirthdayMessage({ nickname: 'N'.repeat(41), message: 'M'.repeat(2001) })
  assert.match(errors.nickname, /40/)
  assert.match(errors.message, /2,000/)
})

test('invalid input stops before client initialization, session lookup, or insertion', async () => {
  let clientAccesses = 0
  const options = { get client() { clientAccesses += 1; throw new Error('Client must not initialize') } }
  for (const input of [null, {}, { ...example, nickname: ' ' }, { ...example, message: '\n' },
    { ...example, nickname: 'N'.repeat(41) }, { ...example, message: 'M'.repeat(2001) }]) {
    await assert.rejects(sendBirthdayMessage(input, options), (error) =>
      error instanceof BirthdayMessageError && error.code === 'validation-failed' && !!error.fieldErrors)
  }
  assert.equal(clientAccesses, 0)
})

test('successful INSERT trims values, sends exactly four fields, and needs no returned row', async () => {
  const { client, calls } = fakeClient()
  const input = Object.freeze({ nickname: '  Test Friend  ', message: '\n' + example.message + '  ', owner_id: 'ignored', is_read: true })
  assert.deepEqual(await sendBirthdayMessage(input, { client }), { sent: true })
  assert.deepEqual(calls.rows, [{ owner_id: userId, nickname: example.nickname, message: example.message, is_read: false }])
  assert.equal(input.nickname, '  Test Friend  ')
  assert.equal(calls.signIns, 0)
})

test('boundary-sized letters insert and HTML/Markdown-looking content stays plain text', async () => {
  const { client, calls } = fakeClient()
  await sendBirthdayMessage({ nickname: 'N'.repeat(40), message: 'M'.repeat(2000) }, { client })
  const text = '<script>alert("test")</script> **a birthday wish**'
  await sendBirthdayMessage({ nickname: '<b>Friend</b>', message: text }, { client })
  assert.equal(calls.rows[0].nickname.length, 40)
  assert.equal(calls.rows[0].message.length, 2000)
  assert.equal(calls.rows[1].message, text)
  assert.equal(calls.rows[1].nickname, '<b>Friend</b>')
})

test('anonymous and permanent sessions are both reused for deliberate later messages', async () => {
  for (const anonymous of [true, false]) {
    const { client, calls } = fakeClient({ anonymous })
    await sendBirthdayMessage(example, { client })
    await sendBirthdayMessage({ ...example, message: 'Another deliberate wish.' }, { client })
    assert.equal(calls.signIns, 0)
    assert.equal(calls.rows.length, 2)
  }
})

test('missing session creates one guest that subsequent messages reuse', async () => {
  const { client, calls } = fakeClient({ sessionExists: false })
  await sendBirthdayMessage(example, { client })
  await sendBirthdayMessage(example, { client })
  assert.equal(calls.signIns, 1)
  assert.equal(calls.rows.length, 2)
})

test('concurrent service callers share Phase 5 anonymous-session initialization', async () => {
  let release
  const pending = new Promise(resolve => { release = resolve })
  const { client, calls } = fakeClient({ sessionExists: false, signIn: () => pending })
  const first = sendBirthdayMessage(example, { client })
  const second = sendBirthdayMessage(example, { client })
  await Promise.resolve()
  assert.equal(calls.signIns, 1)
  release({ data: { session: { user: { id: userId, is_anonymous: true } } }, error: null })
  await Promise.all([first, second])
  assert.equal(calls.signIns, 1)
})

test('missing configuration or failed session prevents message INSERT', async () => {
  await assert.rejects(sendBirthdayMessage(example, { client: null }), error => error.code === 'configuration-unavailable')
  const { client, calls } = fakeClient({ sessionError: { status: 403, message: 'private response context' } })
  await assert.rejects(sendBirthdayMessage(example, { client }), error =>
    error.code === 'session-failed' && !error.technicalCause.includes('private response'))
  assert.equal(calls.signIns, 0)
  assert.equal(calls.rows.length, 0)
})

test('RLS and CHECK errors are sanitized, leave input untouched, and support deliberate retry', async () => {
  for (const code of ['42501', '23514']) {
    let attempts = 0
    const { client, calls } = fakeClient({ insert: () => {
      attempts += 1
      return Promise.resolve(attempts === 1 ? { error: { code, message: 'private response context' }, status: 403 }
        : { data: null, error: null, status: 201 })
    } })
    const input = Object.freeze({ ...example })
    await assert.rejects(sendBirthdayMessage(input, { client }), error =>
      error instanceof BirthdayMessageError && error.technicalCause.includes(code)
      && !error.message.includes('private') && !error.technicalCause.includes('private'))
    assert.deepEqual(input, example)
    assert.equal(calls.rows.length, 1)
    await sendBirthdayMessage(input, { client })
    assert.equal(calls.rows.length, 2)
    assert.equal(calls.signIns, 0)
  }
})

test('stalled message insertion times out, aborts the request, and never automatically retries', async () => {
  const { client, calls } = fakeClient({ insert: () => new Promise(() => {}) })
  await assert.rejects(sendBirthdayMessage(example, { client, timeoutMs: 10 }), error =>
    error.code === 'outcome-unknown' && error.uncertain)
  assert.equal(calls.signals[0].aborted, true)
  assert.equal(calls.rows.length, 1)
})

test('network errors and PostgREST status zero report an uncertain write without raw details', async () => {
  for (const insert of [
    () => Promise.reject(new TypeError('private network context')),
    () => Promise.resolve({ error: { message: 'TypeError: Failed to fetch; private context' }, status: 0 }),
    () => Promise.resolve({ error: { message: 'private context' }, status: 503 }),
  ]) {
    const { client, calls } = fakeClient({ insert })
    await assert.rejects(sendBirthdayMessage(example, { client }), error =>
      error.code === 'outcome-unknown' && error.uncertain && !error.technicalCause.includes('private'))
    assert.equal(calls.rows.length, 1)
  }
})
