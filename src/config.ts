export enum ChainId {
  Ethereum = 1,
  Goerli = 5,
  Avalanche = 43114,
  Solana = 1399811149,
  Blast = 81457,
  Base = 8453,
  Arbitrum = 42161,
  Fantom = 250,
  Bsc = 56,
  Abstract = 2741,
  Sepolia = 11155111,
  Abstract_Testnet = 11124,
  Berachain = 80094,
  Unichain = 130,
  HyperEVM = 999
}

export const ChainIds = [
  ChainId.Ethereum,
  ChainId.Solana,
  ChainId.Avalanche,
  ChainId.Blast,
  ChainId.Base,
  ChainId.Arbitrum,
  ChainId.Fantom,
  ChainId.Bsc,
  ChainId.Abstract,
];

export type ChainConfig = {
  name: string;
  symbol: string;
  explorerUrl: string;
  decimal: number;
};

const ChainConfigs: Record<ChainId, ChainConfig> = {
  [ChainId.Ethereum]: {
    name: 'Ethereum',
    symbol: 'ETH',
    explorerUrl: 'https://etherscan.io',
    decimal: 18
  },
  [ChainId.Goerli]: {
    name: 'Goerli',
    symbol: 'GTH',
    explorerUrl: 'https://goerli.etherscan.io',
    decimal: 18
  },
  [ChainId.Avalanche]: {
    name: 'Avalanche',
    symbol: 'AVAX',
    explorerUrl: 'https://snowtrace.io',
    decimal: 18
  },
  [ChainId.Solana]: {
    name: 'Solana',
    symbol: 'SOL',
    explorerUrl: 'https://solscan.io',
    decimal: 9
  },
  [ChainId.Blast]: {
    name: 'Blast',
    symbol: 'ETH',
    explorerUrl: 'https://blastscan.io',
    decimal: 18
  },
  [ChainId.Base]: {
    name: 'Base',
    symbol: 'ETH',
    explorerUrl: 'https://basescan.org/',
    decimal: 18
  },
  [ChainId.Fantom]: {
    name: 'Fantom',
    symbol: 'FTM',
    explorerUrl: 'https://ftmscan.com',
    decimal: 18
  },
  [ChainId.Abstract]: {
    name: 'Abstract',
    symbol: 'ETH',
    explorerUrl: 'https://abscan.org',
    decimal: 18
  },
  [ChainId.Sepolia]: {
    name: 'Abstract',
    symbol: 'ETH',
    explorerUrl: 'https://sepolia.etherscan.io',
    decimal: 18
  },
  [ChainId.Abstract_Testnet]: {
    name: 'Abstract',
    symbol: 'ETH',
    explorerUrl: 'https://sepolia.abscan.org',
    decimal: 18
  },
  [ChainId.Arbitrum]: {
    name: 'Abstract',
    symbol: 'ETH',
    explorerUrl: 'https://sepolia.abscan.org',
    decimal: 18
  },
  [ChainId.Bsc]: {
    name: 'Bsc',
    symbol: 'BNB',
    explorerUrl: 'https://bscscan.com',
    decimal: 18
  },
  [ChainId.Berachain]: {
    name: 'Berachain',
    symbol: 'BERA',
    explorerUrl: 'https://berascan.com',
    decimal: 18,
  },
  [ChainId.Unichain]: {
    name: 'Unknown Chain',
    symbol: 'TOKEN',
    explorerUrl: '#',
    decimal: 18
  },
  [ChainId.HyperEVM]: {
    name: 'HyperEVM',
    symbol: 'HYPE',
    explorerUrl: 'https://hypurrscan.io"',
    decimal: 18
  }
};

export const getChainConfig = (chainId: number): ChainConfig => {
  if (Object.values(ChainId).includes(chainId as ChainId)) {
    return ChainConfigs[chainId as ChainId];
  }
  return ChainConfigs[ChainId.Unichain];
};

export const SIGNING_MESSAGE_PREFIX =
  "By signing, I hereby agree to Vanish's Terms of Service and agree to be bound by them (docs.vanish.trade/legal/TOS)\n\nDetails: ";

export const COOKIE_SIGNATURE = "admin_signature";
export const COOKIE_TIMESTAMP = "admin_timestamp";
export const ADMIN_FLAG = "admin_flag";
export const ADMIN_ADDRESS = "admin_address";