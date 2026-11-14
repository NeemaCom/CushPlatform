"use client"

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { clearSessionQueryCache, isSessionAuthFailure } from "./authUtils"

export function createQueryClient() {
  let queryClient: QueryClient
  const clearExpiredAuth = (error: unknown) => {
    if (isSessionAuthFailure(error)) {
      clearSessionQueryCache(queryClient)
    }
  }

  queryClient = new QueryClient({
    queryCache: new QueryCache({ onError: clearExpiredAuth }),
    mutationCache: new MutationCache({ onError: clearExpiredAuth }),
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: (failureCount, error) =>
          !isSessionAuthFailure(error) && failureCount < 1,
        refetchOnWindowFocus: false,
      },
    },
  })

  return queryClient
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}