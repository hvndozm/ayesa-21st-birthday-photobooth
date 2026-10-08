import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, dirname, basename } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'
import { isDevelopmentMockCamera } from '../src/utils/mockCameraMode.js'
import { isSupabaseConfigurationValid } from '../src/lib/supabaseClient.js'
import { TemplateValidationError, templateFileErrorMessage, validateTemplatePng } from '../src/utils/templateValidation.js'

test('Vercel rewrites all sixteen production page URLs without server redirects', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'))
  assert.equal(config.$schema, 'https://openapi.vercel.sh/vercel.json')
  assert.equal(config.redirects, undefined)
  assert.equal(config.functions, undefined)
  assert.equal(config.rewrites.length, 1)
  const rewrite = config.rewrites[0]
  assert.equal(rewrite.destination, '/index.html')
  const matcher = new RegExp(`^${rewrite.source}$`)
  for (const path of ['/', '/photobooth', '/photobooth/designs', '/photobooth/camera', '/photobooth/filter',
    '/photobooth/result', '/messages', '/ayesa/login', '/ayesa', '/ayesa/messages', '/ayesa/gallery',
    '/admin/login', '/admin', '/admin/messages', '/admin/gallery', '/admin/designs']) assert.ok(matcher.test(path), path)
})

test('mock selection requires an explicit development query and never overrides production', () => {
  for (const flags of [{}, { isDevelopment: false, isProduction: true }, { isDevelopment: true, isProduction: true }]) {
    assert.equal(isDevelopmentMockCamera(new URLSearchParams('mockCamera=true'), flags), false)
  }
  const development = { isDevelopment: true, isProduction: false }
  assert.equal(isDevelopmentMockCamera(new URLSearchParams('mockCamera=true'), development), true)
  for (const query of ['', 'mockCamera=false', 'mockCamera=True', 'mockCamera=1']) {
    assert.equal(isDevelopmentMockCamera(new URLSearchParams(query), development), false)
  }
})

test('the build engine meets Vite and Supabase requirements and stays consistent with the lockfile', async () => {
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const lockfile = JSON.parse(await readFile(new URL('../package-lock.json', import.meta.url), 'utf8'))
  assert.equal(manifest.engines.node, '>=22.12.0')
  assert.equal(lockfile.packages[''].engines.node, manifest.engines.node)
  const [major, minor] = process.versions.node.split('.').map(Number)
  assert.ok(major > 22 || major === 22 && minor >= 12, 'Build/test with Node 22.12 or later')
})

// Compile the actual modules with Vite's production flags. No .env files or
// remote clients are needed; empty configuration is deliberately defined here.
let productionModules
let temporaryDirectory
after(async () => {
  if (!temporaryDirectory) return
  assert.equal(dirname(resolve(temporaryDirectory)), resolve(tmpdir()))
  assert.ok(basename(temporaryDirectory).startsWith('ayesa-production-test-'))
  await rm(temporaryDirectory, { recursive: true, force: true })
})
async function loadProductionModules() {
  if (!productionModules) productionModules = (async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), 'ayesa-production-test-'))
    await writeFile(join(temporaryDirectory, 'package.json'), '{"type":"module"}')
    await build({
      configFile: false, envFile: false, envDir: false, logLevel: 'silent',
      define: { 'import.meta.env.VITE_SUPABASE_URL': 'undefined', 'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': 'undefined' },
      build: { outDir: temporaryDirectory, emptyOutDir: false, minify: false,
        lib: { entry: {
          mockMode: fileURLToPath(new URL('../src/utils/mockCameraMode.js', import.meta.url)),
          capture: fileURLToPath(new URL('../src/utils/cameraCapture.js', import.meta.url)),
          client: fileURLToPath(new URL('../src/lib/supabaseClient.js', import.meta.url)),
        }, formats: ['es'], fileName: (_format, name) => `${name}.mjs` },
      },
    })
    return Promise.all(['mockMode', 'capture', 'client'].map(name => import(pathToFileURL(join(temporaryDirectory, `${name}.mjs`)).href)))
  })()
  return productionModules
}

test('actual Vite production output ignores mockCamera=true and rejects generated mock frames', async () => {
  const [mode, capture] = await loadProductionModules()
  assert.equal(mode.isDevelopmentMockCamera(new URLSearchParams('mockCamera=true')), false)
  assert.throws(() => capture.captureMockFrame(1, 1), /development-only/)
})

test('actual production client with missing environment settings safely disables backend actions', async () => {
  const [, , client] = await loadProductionModules()
  assert.equal(client.getSupabaseClient(), null)
  for (const settings of [{}, { url: 'https://example.supabase.co', publishableKey: '' },
    { url: 'https://example.supabase.co', publishableKey: 'sb_secret_invalid_test_fixture' }]) {
    assert.equal(isSupabaseConfigurationValid(settings), false)
  }
})

test('unexpected PNG file-read errors use friendly copy without displaying raw messages', async () => {
  const file = new Blob(['local PNG'], { type: 'image/png' })
  file.name = 'birthday.png'
  file.slice = () => ({ arrayBuffer: async () => { throw new Error('Internal file path or diagnostic details') } })
  let failure
  try { await validateTemplatePng(file, '2x6') } catch (error) { failure = error }
  assert.equal(templateFileErrorMessage(failure), 'We couldn’t check this PNG. Please choose it again.')
  assert.equal(templateFileErrorMessage(new TemplateValidationError('file', 'Choose a PNG template file.')), 'Choose a PNG template file.')
  assert.equal(templateFileErrorMessage({ name: 'TemplateValidationError', message: 'Untrusted details' }), 'We couldn’t check this PNG. Please choose it again.')
})
