import { createFileRoute, Outlet } from '@tanstack/react-router'

// Settings layout: index = stacked category cards, children = one page per
// category (mobile-first navigation, same card language as the workflow).
export const Route = createFileRoute('/c/$channelId/settings')({
  component: Outlet,
})
