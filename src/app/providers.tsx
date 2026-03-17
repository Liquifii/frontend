'use client'
import { ApolloWrapper } from "./ApolloWrapper";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode, useState } from 'react'
import { type State, WagmiProvider } from 'wagmi'

import { getConfig } from '../wagmi'
import { SidebarProvider } from '../contexts/sidebar-context'

export function Providers(props: {
  children: ReactNode
  initialState?: State
}) {
  const [config] = useState(() => getConfig())
  const [queryClient] = useState(() => new QueryClient())

  return (
    <ApolloWrapper>
      <WagmiProvider config={config} initialState={props.initialState}>
        <QueryClientProvider client={queryClient}>
          <SidebarProvider>
          {props.children}
          </SidebarProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ApolloWrapper>
  )
}
