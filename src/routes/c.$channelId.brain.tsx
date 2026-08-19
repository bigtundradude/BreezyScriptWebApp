import { createFileRoute, Outlet } from '@tanstack/react-router'

// No left rail (mobile-first treatment, owner 2026-08-18, matching Scripts
// Pro): every view carries its own back link.
export const Route = createFileRoute('/c/$channelId/brain')({
  component: Outlet,
})
