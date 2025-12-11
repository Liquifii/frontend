import { cookieStorage, createConfig, createStorage, http } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

export function getConfig() {
  return createConfig({
    chains: [mainnet, sepolia],
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    connectors: [
      injected({ shimDisconnect: true }),
    ],
    transports: {
      [mainnet.id]: http("https://forno.celo.org"),
      [sepolia.id]: http("https://forno.celo-sepolia.celo-testnet.org/"),
    },
  })
}

declare module 'wagmi' {
  interface Register {
    config: ReturnType<typeof getConfig>
  }
}
