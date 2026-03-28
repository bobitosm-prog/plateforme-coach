export function getAuthCookie(): { role: string; uid: string } | null {
  if (typeof document === 'undefined') return null
  const match = (name: string) => {
    const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
    return m ? m[2] : null
  }
  const role = match('moovx_auth_role')
  const uid = match('moovx_auth_uid')
  if (role && uid) return { role, uid }
  return null
}

export function setAuthCookie(role: string, uid: string) {
  document.cookie = `moovx_auth_role=${role};path=/;max-age=60;SameSite=Lax;Secure`
  document.cookie = `moovx_auth_uid=${uid};path=/;max-age=60;SameSite=Lax;Secure`
}

export function clearAuthCookie() {
  document.cookie = 'moovx_auth_role=;path=/;max-age=0'
  document.cookie = 'moovx_auth_uid=;path=/;max-age=0'
}
