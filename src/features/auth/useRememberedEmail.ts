import { useState } from 'react'

const STORAGE_KEY = 'apontilinkcenter:remembered-email'

export function useRememberedEmail() {
  const [rememberedEmail, setRememberedEmail] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY),
  )

  function remember(email: string) {
    localStorage.setItem(STORAGE_KEY, email)
    setRememberedEmail(email)
  }

  function forget() {
    localStorage.removeItem(STORAGE_KEY)
    setRememberedEmail(null)
  }

  return { rememberedEmail, remember, forget }
}
