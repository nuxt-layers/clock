// Loads the built host in each browser and checks that hydration reproduces the
// server's Clock results exactly. Usage: node tests/browsers.mjs [chromium firefox webkit]
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import * as playwright from 'playwright'

const root = fileURLToPath(new URL('..', import.meta.url))
const engines = process.argv.slice(2).length ? process.argv.slice(2) : ['chromium']
const port = 3917

const server = spawn(process.execPath, ['.output/server/index.mjs'], { cwd: root, env: { ...process.env, PORT: String(port), HOST: '127.0.0.1' }, stdio: 'inherit' })
const stop = () => server.kill()
let failed = false
try {
  for (let i = 0; ; i++) {
    try { if ((await fetch(`http://127.0.0.1:${port}/`)).ok) break } catch {}
    if (i > 100) throw new Error('host did not start')
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  // The server's own results, from the HTML before any browser script runs.
  const html = await (await fetch(`http://127.0.0.1:${port}/`)).text()
  const unescape = text => text.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  const expected = unescape(/<pre data-runtime-probe[^>]*>([^<]*)<\/pre>/.exec(html)?.[1] ?? '')
  if (!expected.startsWith('{')) throw new Error('server did not render the runtime probe')
  console.log(`server (Node ${process.versions.node}, native Temporal: ${typeof globalThis.Temporal !== 'undefined'}): ${expected}`)
  for (const name of engines) {
    const browser = await playwright[name].launch()
    const page = await browser.newPage({ timezoneId: 'America/New_York', locale: 'fr-FR' })
    const problems = []
    page.on('console', message => { if (message.type() === 'error' || /hydration/i.test(message.text())) problems.push(message.text()) })
    page.on('pageerror', error => problems.push(error.message))
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => document.querySelector('#__nuxt')?.__vue_app__)
    const actual = await page.locator('[data-runtime-probe]').textContent()
    const nativeTemporal = await page.evaluate(() => typeof globalThis.Temporal !== 'undefined')
    const date = await page.locator('time').textContent()
    await browser.close()
    if (actual !== expected) problems.push(`probe differs:\n  expected ${expected}\n  actual   ${actual}`)
    if (date !== '05/11/2026') problems.push(`date rendered as ${date}`)
    console.log(`${name} (${browser.version()}, native Temporal: ${nativeTemporal}): ${problems.length ? 'FAILED' : 'passed'}`)
    for (const problem of problems) console.log(`  ${problem}`)
    failed ||= problems.length > 0
  }
} finally { stop() }
process.exit(failed ? 1 : 0)
