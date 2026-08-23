import { useCallback, useState } from "react"

/**
 * Manages flip state for a two-sided card.
 * Kept separate from any card markup so it can be reused
 * by any flippable component (profile card, ID card, etc.)
 */
export function useFlipCard(initialFlipped = false) {
  const [isFlipped, setIsFlipped] = useState(initialFlipped)

  const flip = useCallback(() => setIsFlipped((prev) => !prev), [])
  const showFront = useCallback(() => setIsFlipped(false), [])
  const showBack = useCallback(() => setIsFlipped(true), [])

  return { isFlipped, flip, showFront, showBack }
}
