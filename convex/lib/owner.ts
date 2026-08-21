import { getAuthUserId } from '@convex-dev/auth/server'
import { ConvexError } from 'convex/values'
import type { MutationCtx, QueryCtx } from '../_generated/server'

// The single-user authorization layer (stack decision §4): every Convex
// function calls this first. OWNER_EMAIL is a Convex deployment env var.
//
// The email is read from the JWT claim when present, else from the Convex Auth
// user document — depending on version, the identity token may not carry email.
export async function requireOwner(ctx: QueryCtx | MutationCtx) {
  const owner = process.env.OWNER_EMAIL
  if (!owner) throw new Error('OWNER_EMAIL is not configured on this deployment')

  const identity = await ctx.auth.getUserIdentity()
  // ConvexError: its data reaches the client even on prod deployments (plain
  // Error messages are redacted to "Server Error"), so the UI can show a real
  // wrong-account screen instead of a generic boundary.
  if (!identity) throw new ConvexError({ code: 'not_signed_in' })

  let email = typeof identity.email === 'string' ? identity.email : undefined
  if (!email) {
    const userId = await getAuthUserId(ctx)
    if (userId) {
      const user = await ctx.db.get(userId)
      email = typeof user?.email === 'string' ? user.email : undefined
    }
  }

  if (!email || email.toLowerCase() !== owner.toLowerCase()) {
    // Single-user personal tool: naming the rejected account is fine and makes
    // OWNER_EMAIL mismatches self-diagnosing.
    throw new ConvexError({ code: 'not_owner', email: email ?? '' })
  }
  return identity
}
