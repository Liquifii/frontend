import { cookieStorage, createConfig, createStorage, http } from 'wagmi'
import { celo } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'

export function getConfig() {
  return createConfig({
    chains: [celo],
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    connectors:
      // Avoid connectors that rely on browser-only APIs (like indexedDB) during SSR.
      typeof window === 'undefined'
        ? []
        : [
            miniAppConnector(),
            injected({ shimDisconnect: true }),
            walletConnect({
              projectId: process.env.WALLETCONNECT_PROJECT_ID || '',
            }),
          ],
    transports: {
      [celo.id]: http(),
    },
  })
}
