import { Loader2 } from 'lucide-react'

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      <span className="ml-3 text-slate-400 font-medium">Loading ACAPS data...</span>
    </div>
  )
}
