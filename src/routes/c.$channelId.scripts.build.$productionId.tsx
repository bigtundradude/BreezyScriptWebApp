import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { Id } from '../../convex/_generated/dataModel'
import { ProductionEditor } from '@/features/scripts/ProductionEditor'

type TabId = 'package' | 'interview' | 'material' | 'script' | 'metadata'
const TABS: TabId[] = ['package', 'interview', 'material', 'script', 'metadata']

export const Route = createFileRoute('/c/$channelId/scripts/build/$productionId')({
  validateSearch: (search: Record<string, unknown>): { tab?: TabId } => ({
    tab: TABS.includes(search.tab as TabId) ? (search.tab as TabId) : undefined,
  }),
  component: ProductionEditorPage,
})

function ProductionEditorPage() {
  const { channelId, productionId } = Route.useParams()
  const { tab = 'package' } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  return (
    <ProductionEditor
      key={productionId}
      channelId={channelId as Id<'channels'>}
      productionId={productionId as Id<'productions'>}
      tab={tab}
      onTabChange={(next) =>
        void navigate({ search: { tab: next === 'package' ? undefined : next } })
      }
    />
  )
}
