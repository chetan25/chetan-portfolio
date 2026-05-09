'use client'

import { useEffect, useState } from 'react'

type Result = {
  displayed: string
  isTyping: boolean
}

/**
 * Reveals `text` one character at a time at `speed` ms per char.
 * Resets on text change. While `enabled` is false, returns the full text
 * immediately so consumers can opt out (e.g. accessibility / instant mode).
 */
export function useTypewriter(
  text: string,
  speed = 28,
  enabled = true
): Result {
  const [displayed, setDisplayed] = useState(enabled ? '' : text)
  const [isTyping, setIsTyping] = useState(enabled && text.length > 0)

  useEffect(() => {
    if (!enabled) {
      setDisplayed(text)
      setIsTyping(false)
      return
    }

    if (!text) {
      setDisplayed('')
      setIsTyping(false)
      return
    }

    setDisplayed('')
    setIsTyping(true)

    let i = 0
    const id = window.setInterval(() => {
      i += 1
      setDisplayed(text.slice(0, i))
      if (i >= text.length) {
        window.clearInterval(id)
        setIsTyping(false)
      }
    }, speed)

    return () => {
      window.clearInterval(id)
      setIsTyping(false)
    }
  }, [text, speed, enabled])

  return { displayed, isTyping }
}
