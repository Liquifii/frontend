'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Brain,
  ArrowDownToLine,
  ArrowUpFromLine,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Home', Icon: Home },
  { href: '/deposit', label: 'Deposit', Icon: ArrowDownToLine },
  { href: '/withdrawal', label: 'Withdraw', Icon: ArrowUpFromLine },
  { href: '/ai-assistant', label: 'AI', Icon: Brain },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-[#101018]/95 border-t border-white/10 backdrop-blur-md">
      <div className="max-w-3xl mx-auto px-4 py-2 flex items-center justify-between gap-2">
        {navItems.map(({ href, label, Icon }) => {
          const isActive =
            pathname === href ||
            (href !== '/dashboard' && pathname?.startsWith(href))

          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center rounded-xl px-2 py-1.5 text-xs transition-colors ${
                isActive
                  ? 'bg-[#2BA3FF]/15 text-[#2BA3FF]'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

