import {describe,it,expect,vi} from 'vitest'
import sharp from 'sharp'
vi.mock('server-only',()=>({}))
import {sanitizeImage} from '@/lib/photos/sanitize-image'

describe('image privacy decoding (real libvips runtime)',()=>{
 it('removes camera, GPS, XMP and orientation metadata, after rotating pixels',async()=>{
  const input=await sharp({create:{width:20,height:10,channels:3,background:'#f00'}})
    .withMetadata({orientation:6})
    .withExifMerge({IFD0:{Make:'PRIVATE-CAMERA',Artist:'PRIVATE-PERSON'},IFD3:{GPSLatitudeRef:'N',GPSLatitude:'46/1 30/1 0/1',GPSLongitudeRef:'E',GPSLongitude:'6/1 30/1 0/1'}})
    .withXmp('<x:xmpmeta xmlns:x="adobe:ns:meta/">PRIVATE-LOCATION</x:xmpmeta>').jpeg().toBuffer()
  expect((await sharp(input).metadata()).exif).toBeDefined()
  const output=await sanitizeImage(input), meta=await sharp(output).metadata()
  expect(meta).toMatchObject({width:10,height:20,format:'jpeg'})
  for(const field of ['exif','xmp','iptc','icc','orientation'] as const) expect(meta[field]).toBeUndefined()
  expect(output.toString()).not.toMatch(/PRIVATE-CAMERA|PRIVATE-PERSON|PRIVATE-LOCATION/)
 })
 it.each(['jpeg','png','webp','gif'] as const)('decodes and sanitizes %s',async format=>{
  const input=await sharp({create:{width:3,height:2,channels:4,background:'#fff'}}).toFormat(format).toBuffer()
  expect((await sharp(await sanitizeImage(input)).metadata()).format).toBe('jpeg')
 })
 it('rejects forged headers, SVG, truncated files and oversized bodies',async()=>{
  for(const input of [Buffer.from([255,216,255,217]),Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>')])
    await expect(sanitizeImage(input)).rejects.toMatchObject({status:415})
  await expect(sanitizeImage(Buffer.alloc(5_000_001))).rejects.toMatchObject({status:413})
 })
 it('bounds decompression before allocating oversized pixel buffers',async()=>{
  const input=await sharp({create:{width:6500,height:6500,channels:3,background:'#fff'}}).png().toBuffer()
  await expect(sanitizeImage(input)).rejects.toMatchObject({status:415})
 })
})
