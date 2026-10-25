import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  CoinbaseWalletAdapter,
  MathWalletAdapter,
  SolflareWalletAdapter,
  TrustWalletAdapter
} from '@solana/wallet-adapter-wallets';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const FALLBACK_SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com';

const resolveRpcUrlFromEnv = () => {
  const candidates = [
    process.env.REACT_APP_HELIUS_RPC_SECRET_URL,
    process.env.REACT_APP_SOLANA_RPC_URL,
    process.env.REACT_APP_SOLANA_RPC_URL
  ];

  return candidates.find((url) => typeof url === 'string' && url.trim().length > 0) ?? null;
};

// Default styles that can be overridden by your app
require('@solana/wallet-adapter-react-ui/styles.css');

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

interface AppWalletProviderProps {
  children: React.ReactNode;
}

export default function AppWalletProvider({ children }: AppWalletProviderProps) {
  const network = WalletAdapterNetwork.Mainnet;
  const [rpcUrl, setRpcUrl] = useState<string>(() => resolveRpcUrlFromEnv() || FALLBACK_SOLANA_RPC_URL);

  const ensureValidRpcUrl = useCallback((url: string | null) => {
    if (url && /^https?:\/\//i.test(url)) {
      return url;
    }

    return FALLBACK_SOLANA_RPC_URL;
  }, []);

  // Load RPC URL on component mount
  useEffect(() => {
    const url = resolveRpcUrlFromEnv();
    setRpcUrl(ensureValidRpcUrl(url));
  }, [ensureValidRpcUrl]);

  // Use the RPC URL from state
  const endpoint = useMemo(() => {
    return ensureValidRpcUrl(rpcUrl);
  }, [ensureValidRpcUrl, rpcUrl]);

  //wallets
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new MathWalletAdapter(),
      new TrustWalletAdapter(),
      new CoinbaseWalletAdapter()
    ],
    [network]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect={true}>
          <WalletModalProvider>{children}</WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </QueryClientProvider>
  );
}
