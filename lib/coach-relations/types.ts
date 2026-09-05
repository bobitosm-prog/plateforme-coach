export type CoachRelationSource = 'default' | 'invitation' | 'admin' | 'legacy'
export type AuthoritativeCoachRelationSource = Extract<CoachRelationSource, 'invitation' | 'admin'>
