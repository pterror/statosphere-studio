import { writeFileSync } from 'fs'
import { join } from 'path'

const COMMIT = process.env.COMMIT ?? 'e67cd9ffaf1ee63e7b5c7bce11462516f547f5f7'
const BASE = `https://raw.githubusercontent.com/Lord-Raven/statosphere/${COMMIT}/src/assets`
const SCHEMAS_DIR = join(import.meta.dir, '..', 'schemas')
const NAMES = ['variable', 'function', 'classifier', 'generator', 'content']

for (const name of NAMES) {
  const url = `${BASE}/${name}-schema.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  const text = await res.text()
  writeFileSync(join(SCHEMAS_DIR, `${name}-schema.json`), text)
  console.log(`ok: ${name}-schema.json`)
}

writeFileSync(join(SCHEMAS_DIR, 'upstream-commit.txt'), COMMIT + '\n')
console.log(`pinned to ${COMMIT}`)
