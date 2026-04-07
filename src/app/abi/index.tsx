import AttestifyVault from './AttestifyVault.json';
import Strategy from './Strategy.json';

export const AttestifyVaultContract ={
    AttestifyVault: AttestifyVault,
    // Use PROXY address for contract interactions (proxy delegates to implementation)
    address: '0x5e12835dd11a7d35e0d5e49e2c66b9235c148243', // Vault Proxy
    // ABI is from implementation: 0x97fc253b38e913d4ab8d30df7b28910f065c8f1c
};

export const StrategyContract ={
    Strategy: Strategy,
    address: '0x549e5a5e7299A00b23cE3811913EFB549FAA470f', // AaveV3Strategy
};

// USDm (formerly cUSD) Token Address
export const USDM_ADDRESS = '0x765DE816845861e75A25fCA122bb6898B8B1282a';
// Back-compat export (deprecated): some files may still import CUSD_ADDRESS
export const CUSD_ADDRESS = USDM_ADDRESS;

// New Registry-based flow (read-only)
export const REGISTRY_ADDRESS = '0xdbbe08104feaa4a97e8df7d5139b44229aa82ab2' as const;
export const REGISTRY_ABI = [
  {
    name: 'getVault',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [{ type: 'address' }],
  },
] as const;

// Supported assets on Celo mainnet (6 decimals)
export const TOKENS = {
  USDC: {
    symbol: 'USDC',
    address: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C' as const,
    decimals: 6 as const,
  },
  USDT: {
    symbol: 'USDT',
    address: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e' as const,
    decimals: 6 as const,
  },
  USDM: {
    symbol: 'USDm',
    address: USDM_ADDRESS,
    decimals: 18 as const,
  },
} as const;

// Contract Addresses Reference:
// - Vault Proxy: 0x5e12835dd11a7d35e0d5e49e2c66b9235c148243 (use this for interactions)
// - Vault Implementation: 0x97fc253b38e913d4ab8d30df7b28910f065c8f1c (get ABI from here)
// - Strategy: 0x549e5a5e7299A00b23cE3811913EFB549FAA470f
// - USDm: 0x765DE816845861e75A25fCA122bb6898B8B1282a
// - Registry (proxy): 0xdbbe08104feaa4a97e8df7d5139b44229aa82ab2
// - USDC: 0xcebA9300f2b948710d2653dD7B07f33A8B32118C (decimals 6)
// - USDT: 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e (decimals 6)