import {expect,it} from 'vitest'
import {GET,generateStaticParams} from '@/app/api/legal/[locale]/[document]/route'
it.each(generateStaticParams())('serves the checked-in $locale $document without a redirect', async params=>{
 const response=await GET(new Request('https://app.moovx.ch/api/legal'),{params:Promise.resolve(params)})
 expect(response.status).toBe(200);expect(response.headers.has('location')).toBe(false)
 const {html}=await response.json();expect(html).toContain('<h1>');expect(html.length).toBeGreaterThan(1000)
})
it.each([{locale:'../..',document:'privacy'},{locale:'fr',document:'../../.env.local'},{locale:'it',document:'cgu'}])('rejects a document outside the public allowlist',async params=>{
 expect((await GET(new Request('https://app.moovx.ch/api/legal'),{params:Promise.resolve(params)})).status).toBe(404)
})
