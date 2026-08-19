import {
  Clapperboard,
  Image as ImageIcon,
  Library,
  Lightbulb,
  MessageCircleQuestion,
  PenLine,
  Sparkles,
  Tags,
  Type,
  type LucideIcon,
} from 'lucide-react'

// Client mirror of convex/ideaBank.ts STEP_ORDER (docs/idea-workflow-plan.md §2).
// `route` is the path segment under /c/$channelId/bank/$ideaId; steps without one
// are placeholders and render locked in the overview.
export type StepId =
  | 'idea'
  | 'titles'
  | 'thumbnails'
  | 'questions'
  | 'research'
  | 'draft'
  | 'refine'
  | 'record'
  | 'metadata'

export const STEPS: Array<{
  id: StepId
  name: string
  blurb: string
  icon: LucideIcon
  route?: string
}> = [
  { id: 'idea', name: 'Idea', blurb: 'Title, description, and rating.', icon: Lightbulb, route: 'idea' },
  { id: 'titles', name: 'Potential Titles', blurb: 'Three candidates, one primary.', icon: Type, route: 'titles' },
  { id: 'thumbnails', name: 'Thumbnails', blurb: 'Up to three thumbnails, A/B style.', icon: ImageIcon, route: 'thumbnails' },
  { id: 'questions', name: 'Leading Questions', blurb: 'Record answers, paste the transcript.', icon: MessageCircleQuestion, route: 'questions' },
  { id: 'research', name: 'Research Collection', blurb: 'Notes, research, CTAs, disclaimer.', icon: Library, route: 'research' },
  { id: 'draft', name: 'Script Drafter', blurb: 'Generate drafts, send one to refinement.', icon: PenLine, route: 'draft' },
  { id: 'refine', name: 'Script Refinement', blurb: 'Edit the script you will record.', icon: Sparkles, route: 'refine' },
  { id: 'record', name: 'Ready to Record', blurb: 'Read-only script with teleprompter.', icon: Clapperboard, route: 'record' },
  { id: 'metadata', name: 'Publish Metadata', blurb: 'Copy-paste titles, description, thumbnails.', icon: Tags, route: 'metadata' },
]

// A step is unlocked iff every earlier step is marked ready.
export function isStepUnlocked(index: number, readySteps: string[]) {
  return STEPS.slice(0, index).every((step) => readySteps.includes(step.id))
}
