import { readFileSync, readdirSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const host = resolve(dirname(fileURLToPath(import.meta.url)), '../examples/minimal-host')
const excluded = new Set(['node_modules', '.nuxt', '.output', '.cache', 'coverage', 'tests', 'docs', '.git'])
const screenPaths = /^(?:app\/)?(?:pages|components|layouts)\//
const sourceTypes = new Set(['.ts', '.tsx', '.js', '.mjs', '.vue'])
const capabilityUse = /@nuxt-layers\/clock|\buse(?:Server)?Clock\b|\bclock\s*:|\bmockConfigurationAnswer\b/
const budget = 50
let lines = 0
const breakdown = []

function visit(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) { visit(path); continue }
    const name = relative(host, path).replaceAll('\\', '/')
    if (name === 'app/app.vue' || screenPaths.test(name) || !sourceTypes.has(extname(name))) continue
    const content = readFileSync(path, 'utf8')
    if (!capabilityUse.test(content)) continue
    const count = content.trimEnd().split(/\r?\n/).length
    lines += count
    breakdown.push(`${name}: ${count}`)
  }
}

visit(host)
const manifest = readFileSync(join(host, 'package.json'), 'utf8')
const dependencyLines = manifest.split(/\r?\n/).filter(line => line.includes('"@nuxt-layers/clock"')).length
lines += dependencyLines
breakdown.push(`package.json dependency declarations: ${dependencyLines}`)
console.log(`Clock host composition: ${lines}/${budget} lines\n${breakdown.join('\n')}`)
if (dependencyLines !== 1 || lines > budget) process.exitCode = 1
