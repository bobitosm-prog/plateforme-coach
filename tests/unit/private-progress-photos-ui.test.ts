import {readFileSync} from 'node:fs'
import {describe,expect,it} from 'vitest'
describe('private progress photo display contract',()=>{
 it('uses expiring URLs in the active Progression page and discards stale photo results',()=>{
  const source=readFileSync('app/components/tabs/ProgressTab.tsx','utf8')
  expect(source).not.toContain("from('progress-photos').getPublicUrl")
  expect(source).toContain("from('progress-photos').createSignedUrl")
  expect(source).toContain('createSignedUrl(photo.photo_url, 3600)')
  expect(source).toContain('photoUrlResult.key === requestedPhotoKey ? photoUrlResult.urls : {}')
  expect(source).toContain('return () => { cancelled = true }')
 })
 it.each(['app/components/tabs/ProgressTab.tsx','app/(application)/client/[id]/hooks/useClientDetail.ts',
  'app/(application)/onboarding-photo/OnboardingPhotoContent.tsx'])('preserves signed links in %s',path=>{
   expect(readFileSync(path,'utf8')).toContain("from('progress-photos').createSignedUrl")
 })
})
