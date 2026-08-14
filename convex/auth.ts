import Google from '@auth/core/providers/google'
import { convexAuth } from '@convex-dev/auth/server'

// Sign-in scopes are openid email profile ONLY (stack decision §4).
// A future "Connect YouTube" flow is a separate grant — never merge it into login.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google],
})
