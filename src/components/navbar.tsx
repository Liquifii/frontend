import Image from 'next/image'
import Link from 'next/link'
import { Sun } from 'lucide-react'
import { useAccount, useConnect, useDisconnect, useConnectors } from 'wagmi'

const Navbar = () => {
  const { isConnected, address } = useAccount()
  const { connect, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const connectors = useConnectors()

  // Handle wallet connection - Farcaster handles wallet selection
  const handleConnect = () => {
    if (connectors.length > 0) {
      // Use the first available connector (Farcaster connector)
      // Farcaster will handle showing wallet selection if needed
      connect({ connector: connectors[0] })
    }
  }

  return (
    <nav className="w-full text-white bg-nav-gradient">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image 
            src="/LiquiFi TP Logo 1.png" 
            alt="LiquiFi Logo" 
            width={120} 
            height={40}
            className="h-8 w-auto"
            priority
          />
        </Link>

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
              type="button"
              onClick={handleConnect}
              disabled={isPending || connectors.length === 0}
              className="border border-[#2BA3FF] hover:bg-[#2BA3FF]/10 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md transition-colors"
            >
              {isPending ? 'Connecting...' : 'Connect'}
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar