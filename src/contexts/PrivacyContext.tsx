'use client'

import { createContext, useContext, useState } from 'react'

interface PrivacyCtx { hidden: boolean; toggle: () => void }
const Ctx = createContext<PrivacyCtx>({ hidden: false, toggle: () => {} })

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false)
  return (
    <Ctx.Provider value={{ hidden, toggle: () => setHidden(h => !h) }}>
      {children}
    </Ctx.Provider>
  )
}

export const usePrivacy = () => useContext(Ctx)
