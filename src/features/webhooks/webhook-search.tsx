import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'

const DEBOUNCE_MS = 300

type WebhookSearchProps = {
  /** The search currently in the URL. */
  value: string
  onSearch: (search: string) => void
}

// The input keeps its own text so typing is instant; the URL follows after a pause.
export function WebhookSearch({ value, onSearch }: WebhookSearchProps) {
  const [input, setInput] = useState(value)
  const [prevValue, setPrevValue] = useState(value)

  // Back/forward changes the URL: take the new value over while rendering, not in an effect,
  // so there is never a frame that shows the old text next to the new results.
  if (value !== prevValue) {
    setPrevValue(value)
    setInput(value)
  }

  useEffect(() => {
    if (input === value) return
    const timer = setTimeout(() => onSearch(input), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [input, value, onSearch])

  return (
    <Input
      type="search"
      aria-label="Search by name"
      placeholder="Search by name…"
      className="max-w-sm"
      value={input}
      onChange={(event) => setInput(event.target.value)}
    />
  )
}
