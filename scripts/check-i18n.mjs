import fs from 'node:fs'

const langs = ['fr', 'en', 'de']
const messages = Object.fromEntries(
  langs.map(l => [l, JSON.parse(fs.readFileSync(`messages/${l}.json`, 'utf8'))])
)

function flatten(obj, prefix = '') {
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'string') out[key] = v
    else if (typeof v === 'object' && v !== null) Object.assign(out, flatten(v, key))
  }
  return out
}

const flat = Object.fromEntries(langs.map(l => [l, flatten(messages[l])]))
const refKeys = new Set(Object.keys(flat.fr))

let hasError = false
for (const lang of ['en', 'de']) {
  const langKeys = new Set(Object.keys(flat[lang]))
  const missing = [...refKeys].filter(k => !langKeys.has(k))
  const extra = [...langKeys].filter(k => !refKeys.has(k))
  if (missing.length) {
    console.error(`${lang}: ${missing.length} missing keys:`)
    missing.forEach(k => console.error(`  - ${k}`))
    hasError = true
  }
  if (extra.length) {
    console.error(`${lang}: ${extra.length} extra keys (possible typos):`)
    extra.forEach(k => console.error(`  + ${k}`))
    hasError = true
  }
}

// Check ICU variable consistency
const icuVarRe = /\{[a-zA-Z_]+\}/g
for (const lang of ['en', 'de']) {
  for (const key of Object.keys(flat.fr)) {
    const frVars = (flat.fr[key].match(icuVarRe) || []).sort().join(',')
    const langVal = flat[lang][key]
    if (!langVal) continue
    const langVars = (langVal.match(icuVarRe) || []).sort().join(',')
    if (frVars !== langVars) {
      console.error(`${lang} ICU mismatch at ${key}: FR={${frVars}} ${lang}={${langVars}}`)
      hasError = true
    }
  }
}

if (hasError) {
  console.error('\n✗ i18n parity check FAILED')
  process.exit(1)
}

console.log(`✓ i18n parity OK — ${Object.keys(flat.fr).length} keys × ${langs.length} languages`)
