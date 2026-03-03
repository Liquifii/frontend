import { cookieStorage, createConfig, createStorage, http } from 'wagmi'
import { celo } from 'wagmi/chains'
import { farcasterMiniApp as miniAppConnector } from "@farcaster/miniapp-wagmi-connector";

const isServer = typeof window === 'undefined'

// Create config with connectors only on client side
// For SSR, cookieToInitialState only needs the config structure, not initialized connectors
// Farcaster handles wallet selection (internal or external), so we only need the Farcaster connector
export function getConfig() {
  return createConfig({
    chains: [celo],
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    // Only create connector on client side to avoid indexedDB access during SSR
    // cookieToInitialState works fine with empty connectors array
    connectors: isServer ? [] : [miniAppConnector()],
    transports: {
      [celo.id]: http(),
    },
  })
}
