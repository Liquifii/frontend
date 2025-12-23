import React from 'react'
import Image from 'next/image'
import { Sun } from 'lucide-react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'

const Navbar = () => {
  const { isConnected, address } = useAccount()
  const { connect, connectors, status: connectStatus, error } = useConnect()
  const { disconnect } = useDisconnect()

  const onConnect = () => {
    if (connectors?.[0]) connect({ connector: connectors[0] })
  }

  return (
    <nav className="w-full text-white bg-nav-gradient">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image 
            src="/LiquiFi TP Logo 1.png" 
            alt="LiquiFi Logo" 
            width={120} 
            height={40}
            className="h-8 w-auto"
            priority
          />
        </div>

        <div className="flex items-center space-x-3">
          <Sun size={20} className="text-white" />
          {isConnected ? (
            <div className="flex items-center gap-2">
              <span className="text-white/80 text-sm hidden sm:block">
                {address?.slice(0, 6)}…{address?.slice(-4)}
              </span>
              <button
                onClick={() => disconnect()}
                className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-md text-sm"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={onConnect}
              disabled={connectStatus === 'pending'}
              className="border border-[#2BA3FF] hover:bg-[#2BA3FF]/10 disabled:opacity-60 text-white px-4 py-2 rounded-md transition-colors"
            >
              {connectStatus === 'pending' ? 'Connecting…' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar



