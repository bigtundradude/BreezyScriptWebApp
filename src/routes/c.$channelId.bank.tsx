import { createFileRoute, Outlet } from '@tanstack/react-router'

// No left rail anywhere in the bank tool (docs/idea-workflow-plan.md §2):
// the workflow is phone-primary and every view carries its own back link.
export const Route = createFileRoute('/c/$channelId/bank')({
  component: Outlet,
})
