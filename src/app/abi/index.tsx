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

// cUSD Token Address (for approvals before deposits)
export const CUSD_ADDRESS = '0x765DE816845861e75A25fCA122bb6898B8B1282a';

// Contract Addresses Reference:
// - Vault Proxy: 0x5e12835dd11a7d35e0d5e49e2c66b9235c148243 (use this for interactions)
// - Vault Implementation: 0x97fc253b38e913d4ab8d30df7b28910f065c8f1c (get ABI from here)
// - Strategy: 0x549e5a5e7299A00b23cE3811913EFB549FAA470f
// - cUSD: 0x765DE816845861e75A25fCA122bb6898B8B1282a