import { useEffect, useState } from 'react'
import { useConvex } from 'convex/react'
import { WifiOff } from 'lucide-react'

// Offline posture v1 (plan §8): quiet when connected, explicit pill when not.
export function ConnectionIndicator() {
  const convex = useConvex()
  const [connected, setConnected] = useState(true)

  useEffect(() => {
    const check = () => setConnected(convex.connectionState().isWebSocketConnected)
    check()
    const interval = setInterval(check, 2000)
    return () => clearInterval(interval)
  }, [convex])

  if (connected) return null
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/12 px-2.5 py-1 text-2xs font-medium text-warning">
      <WifiOff size={11} />
      Offline — edits held locally
    </span>
  )
}
