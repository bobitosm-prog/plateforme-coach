// Read-only inventory. Credentials remain in the process environment; only counts leave it.
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
let stage='configuration'

try {
  const expected = process.argv[2]
  if (!['njlzossopgknanhkzcbk','cycbnnojcymjnaqomlyj'].includes(expected)) throw new Error('TARGET_REQUIRED')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (new URL(url).hostname !== `${expected}.supabase.co`) throw new Error('TARGET_MISMATCH')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!key) throw new Error('CREDENTIAL_UNAVAILABLE')
  stage='client'
  const db = createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(20_000)})}})
  const result = {}
  for (const bucket of ['avatars','progress-photos']) {
    const stats = {objects:0,bytes:0,metadata:0,exif:0,xmp:0,iptc:0,icc:0,unreadable:0,formats:{}}
    async function walk(prefix='',depth=0) {
      if (depth>4) throw new Error('DEPTH_LIMIT')
      for(let offset=0;;offset+=100) {
        stage='listing'
        const {data,error}=await db.storage.from(bucket).list(prefix,{limit:100,offset,sortBy:{column:'name',order:'asc'}})
        if(error || !data) throw new Error('LIST_FAILED')
        for(const object of data) {
          const path=prefix ? `${prefix}/${object.name}` : object.name
          if(!object.id){await walk(path,depth+1);continue}
          stats.objects++
          if(stats.objects>200 || Number(object.metadata?.size)>10_000_000) throw new Error('INVENTORY_LIMIT')
          stage='download'
          const {data:blob,error:downloadError}=await db.storage.from(bucket).download(path)
          if(downloadError || !blob || blob.size>10_000_000) throw new Error('DOWNLOAD_FAILED')
          const bytes=Buffer.from(await blob.arrayBuffer());stats.bytes+=bytes.length
          try {
            const meta=await sharp(bytes,{limitInputPixels:40_000_000}).metadata()
            stats.formats[meta.format]=(stats.formats[meta.format]||0)+1
            let found=false
            for(const name of ['exif','xmp','iptc','icc']) if(meta[name]){stats[name]++;found=true}
            if(found) stats.metadata++
          } catch {stats.unreadable++}
        }
        if(data.length<100) break
      }
    }
    await walk();result[bucket]=stats
  }
  console.log(JSON.stringify({readOnly:true,result}))
} catch (error) {
  const codes=['TARGET_REQUIRED','TARGET_MISMATCH','CREDENTIAL_UNAVAILABLE','DEPTH_LIMIT','INVENTORY_LIMIT','LIST_FAILED','DOWNLOAD_FAILED']
  console.error(JSON.stringify({failed:true,stage,code:codes.includes(error?.message)?error.message:'INVENTORY_FAILED',noFilesChanged:true}))
  process.exitCode=1
}
