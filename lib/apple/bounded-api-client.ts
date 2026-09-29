import 'server-only'
import { AppStoreServerAPIClient, Environment } from '@apple/app-store-server-library'
import fetch, { Response } from 'node-fetch'
import type { URLSearchParams } from 'node:url'
/** Keep official request signing/validation while bounding the actual transport and body. */
export class BoundedAppleAPIClient extends AppStoreServerAPIClient {
  private readonly endpoint: string
  constructor(...args: ConstructorParameters<typeof AppStoreServerAPIClient>) {
    super(...args)
    this.endpoint = args[4] === Environment.PRODUCTION
      ? 'https://api.storekit.itunes.apple.com' : 'https://api.storekit-sandbox.itunes.apple.com'
  }
  protected override async makeFetchRequest(path: string, query: URLSearchParams, method: string,
    body: string | Buffer | undefined, headers: Record<string, string>): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 12000)
    try {
      const response = await fetch(`${this.endpoint}${path}?${query}`, {
        method, body, headers, signal: controller.signal, redirect: 'error', size: 1024 * 1024,
      })
      const bytes = await response.buffer()
      return new Response(bytes, { status: response.status, statusText: response.statusText, headers: response.headers })
    } finally { clearTimeout(timer) }
  }
}
