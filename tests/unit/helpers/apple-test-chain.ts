import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { sign, X509Certificate } from 'node:crypto'

/** Ephemeral test PKI with Apple's required extension OIDs; no stored private keys. */
export function createAppleTestChain() {
  const directory = mkdtempSync(join(tmpdir(), 'moovx-apple-pki-'))
  const run = (...args: string[]) => execFileSync('openssl', args, { cwd: directory, stdio: 'pipe' })
  try {
    run('req', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:prime256v1', '-nodes',
      '-keyout', 'root.key', '-out', 'root.pem', '-days', '2', '-subj', '/CN=MoovX TEST Root',
      '-addext', 'basicConstraints=critical,CA:TRUE', '-addext', 'keyUsage=critical,keyCertSign,cRLSign')
    for (const name of ['intermediate', 'leaf']) {
      run('req', '-new', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:prime256v1', '-nodes',
        '-keyout', `${name}.key`, '-out', `${name}.csr`, '-subj', `/CN=MoovX TEST ${name}`)
      const isIntermediate = name === 'intermediate'
      writeFileSync(join(directory, `${name}.ext`), isIntermediate
        ? 'basicConstraints=critical,CA:TRUE\nkeyUsage=critical,keyCertSign,cRLSign\n1.2.840.113635.100.6.2.1=DER:05:00\n'
        : 'basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature\n1.2.840.113635.100.6.11.1=DER:05:00\n')
      const parent = isIntermediate ? 'root' : 'intermediate'
      run('x509', '-req', '-in', `${name}.csr`, '-CA', `${parent}.pem`, '-CAkey', `${parent}.key`,
        '-CAcreateserial', '-out', `${name}.pem`, '-days', '2', '-extfile', `${name}.ext`)
    }
    const root = readFileSync(join(directory, 'root.pem'))
    const key = readFileSync(join(directory, 'leaf.key'))
    const x5c = ['leaf', 'intermediate', 'root'].map(name =>
      new X509Certificate(readFileSync(join(directory, `${name}.pem`))).raw.toString('base64'))
    return {
      root,
      sign(payload: object) {
        const body = [ { alg: 'ES256', x5c }, payload ]
          .map(value => Buffer.from(JSON.stringify(value)).toString('base64url')).join('.')
        return `${body}.${sign('sha256', Buffer.from(body), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url')}`
      },
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}
