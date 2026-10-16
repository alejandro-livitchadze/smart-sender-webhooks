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
  const [sent, setSent] = useState(value)

  // Back/forward and "Clear search" change the URL: take that value over while rendering, not in
  // an effect, so no frame shows the old text next to the new results. Our own push coming back
  // (`sent`) is skipped: the URL commits late, and the text typed meanwhile must survive.
  if (value !== prevValue) {
    setPrevValue(value)
    if (value !== sent) {
      setSent(value)
      setInput(value)
    }
  }

  useEffect(() => {
    if (input === value) return
    const timer = setTimeout(() => {
      setSent(input)
      onSearch(input)
    }, DEBOUNCE_MS)
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
