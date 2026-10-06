import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { exerciseMedia } from '../../lib/exercise-video-media'
import { readdirSync } from 'node:fs'
describe('published exercise media',()=>{
 it('keeps validated video files and posters together',()=>{
  for(const poster of readdirSync('public/images/video-posters')) {
   const slug=poster.replace('.webp','')
   if(!existsSync(`public/videos/exercises/${slug}.mp4`))continue
   const media=exerciseMedia(`/videos/exercises/${slug}.mp4?v=1`)
   expect(media.poster).toBe(`/images/video-posters/${slug}.webp`)
   expect(existsSync(`public${media.video!.split('?')[0]}`)).toBe(true)
  }
 })
 it('prefers the validated Ab Roller video over its old storage copy',()=>{
  expect(exerciseMedia('https://example.com/storage/ab-roller/ab-roller.mp4').video).toBe('/videos/exercises/ab-roller.mp4?v=moovx-20261006')
 })
 it('preserves other available videos without guessing an exercise',()=>{
  expect(exerciseMedia('https://example.com/other.mp4?v=4')).toEqual({video:'https://example.com/other.mp4?v=4',poster:undefined})
  expect(exerciseMedia(null).video).toBeUndefined()
 })
})
