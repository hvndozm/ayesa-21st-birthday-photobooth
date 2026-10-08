const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isPermanentSession(session) {
  return session?.user?.is_anonymous === false && uuidPattern.test(session.user.id ?? '')
}

export function getPrivateArea(role) {
  if (role === 'ayesa') return '/ayesa'
  if (role === 'admin') return '/admin'
  return null
}

export function normalizeOwnProfile(profile, userId) {
  if (!profile || profile.id !== userId || !['ayesa', 'admin'].includes(profile.role)) return null
  return {
    id: profile.id,
    role: profile.role,
    display_name: typeof profile.display_name === 'string' ? profile.display_name.trim().slice(0, 100) : '',
  }
}

export function getProtectedAccess(auth, requiredRole) {
  if (auth.status === 'initializing' || auth.status === 'loading-profile') return { kind: 'loading' }
  if (!isPermanentSession(auth.session)) return { kind: 'redirect', to: `/${requiredRole}/login` }
  const profile = normalizeOwnProfile(auth.profile, auth.session.user.id)
  if (!profile || auth.error) return { kind: 'denied' }
  if (profile.role !== requiredRole) return { kind: 'redirect', to: getPrivateArea(profile.role) }
  return { kind: 'allowed' }
}
