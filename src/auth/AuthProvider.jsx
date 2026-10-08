import { useMemo, useSyncExternalStore } from 'react'
import { AuthContext } from './AuthContext.js'
import { createAuthController } from './authController.js'

const controller = createAuthController()

export default function AuthProvider({ children }) {
  const auth = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
  const value = useMemo(() => ({
    ...auth,
    user: auth.session?.user ?? null,
    signIn: controller.signIn,
    logout: controller.logout,
    retry: controller.retry,
  }), [auth])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
