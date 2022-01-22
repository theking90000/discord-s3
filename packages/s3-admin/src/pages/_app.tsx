import { ChakraProvider } from "@chakra-ui/react";

import theme from "../theme";
import { AppProps } from "next/app";
import RouteGuard from "../components/RouteGuard";
import { Hydrate, QueryClient, QueryClientProvider } from "react-query";
import { ReactQueryDevtools } from "react-query/devtools";
import { createContext, StrictMode } from "react";
import { appWithTranslation } from "next-i18next";
import Head from "next/document";

const queryClient = new QueryClient();

export const ValueContext = createContext<{
  value: any;
  setValue: (value: any) => void;
}>({
  value: {},
  setValue: (value: any) => {},
});

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ChakraProvider resetCSS theme={theme}>
          <ValueContext.Provider value={{ value: {}, setValue: () => {} }}>
            <RouteGuard>
              <Component {...pageProps} />
            </RouteGuard>
          </ValueContext.Provider>
        </ChakraProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </StrictMode>
  );
}

export default appWithTranslation(MyApp);
