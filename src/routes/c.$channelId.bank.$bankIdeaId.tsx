import { createFileRoute, Outlet } from '@tanstack/react-router'

// Pass-through layout for one idea's workflow: index = step overview,
// children = the individual step views.
export const Route = createFileRoute('/c/$channelId/bank/$bankIdeaId')({
  component: Outlet,
})
