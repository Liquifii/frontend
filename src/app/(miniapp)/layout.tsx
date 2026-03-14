'use client'

import type { ReactNode } from 'react'
import Navbar from '../../components/navbar'
import BottomNav from '../../components/bottom-nav'

export default function MiniAppLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ backgroundColor: '#0E0E11', minHeight: '100vh' }}>
      <Navbar />
      <main className="px-4 pt-4 pb-24 lg:px-6">{children}</main>
      <BottomNav />
    </div>
  )
}

