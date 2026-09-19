import {readFileSync} from 'node:fs'
import {describe,expect,it} from 'vitest'
describe('private progress photo display contract',()=>{
 it('uses expiring URLs on desktop and gates cached links by the current account',()=>{
  const source=readFileSync('app/(dashboard)/page-desktop.tsx','utf8')
  expect(source).not.toContain("from('progress-photos').getPublicUrl")
  expect(source).toContain("from('progress-photos').createSignedUrl")
  expect(source).toContain('photoLinks.owner === session?.user?.id')
  expect(source).toContain('referrerPolicy="no-referrer"')
 })
 it.each(['app/components/tabs/ProgressTab.tsx','app/(application)/client/[id]/hooks/useClientDetail.ts',
  'app/(application)/onboarding-photo/OnboardingPhotoContent.tsx'])('preserves signed links in %s',path=>{
   expect(readFileSync(path,'utf8')).toContain("from('progress-photos').createSignedUrl")
 })
})
