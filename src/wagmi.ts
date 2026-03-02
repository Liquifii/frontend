import { cookieStorage, createConfig, createStorage, http } from 'wagmi'
import { celo, celoSepolia } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'
import { farcasterMiniApp as miniAppConnector } from "@farcaster/miniapp-wagmi-connector";

export function getConfig() {
  return createConfig({
    chains: [celo, celoSepolia],
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    connectors: [
      miniAppConnector(),
      injected({ shimDisconnect: true }),
      walletConnect({
        projectId: process.env.WALLETCONNECT_PROJECT_ID || '',
      }),
    ],
    transports: {
      [celo.id]: http("https://forno.celo.org"),
      [celoSepolia.id]: http("https://forno.celo-sepolia.celo-testnet.org/"),
    },
  })
}
