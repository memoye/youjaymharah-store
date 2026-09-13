import {
  defaultShouldDehydrateQuery,
  isServer,
  QueryCache,
  QueryClient,
} from "@tanstack/react-query";

import { isClientError, isUnauthorized } from "@/lib/medusa/errors";

import { queryKeys } from "./keys";

declare module "@tanstack/react-query" {
  interface Register {
    queryMeta: {
      /**
       * Needs the signed-in customer. A 401 on such a query means the session
       * ended, which the query cache below turns into "signed out".
       */
      private?: boolean;
    };
  }
}

function makeQueryClient(): QueryClient {
  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (query.meta?.private && isUnauthorized(error)) {
          queryClient.setQueryData(queryKeys.customer.me(), null);
        }
      },
    }),
    defaultOptions: {
      queries: {
        // Long enough that data hydrated from the server is not refetched the
        // moment the page becomes interactive.
        staleTime: 60_000,
        retry: (failureCount, error) =>
          !isClientError(error) && failureCount < 2,
      },
      mutations: {
        // A retried POST can add the same item to a cart twice.
        retry: false,
      },
      dehydrate: {
        // Also send queries still pending on the server, so a prefetch that was
        // started but not awaited streams into the client instead of refetching.
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
    },
  });

  return queryClient;
}

let browserQueryClient: QueryClient | undefined;

/**
 * A new client for every server render, so one visitor's data can never leak
 * into another's page; one shared client in the browser, so the cache survives
 * navigation.
 */
export function getQueryClient(): QueryClient {
  if (isServer) {
    return makeQueryClient();
  }

  browserQueryClient ??= makeQueryClient();

  return browserQueryClient;
}
