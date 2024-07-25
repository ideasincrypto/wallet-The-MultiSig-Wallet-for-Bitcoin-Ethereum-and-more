import localForage from 'localforage';

interface Backend {
  node: string;
  api?: string;
  explorer?: string;
}
type backends = Record<string, Backend>;

let localForgeBackends: backends = {};

export function loadBackendsConfig() {
  (async () => {
    const localForgeBackendsStorage: backends =
      (await localForage.getItem('backends')) ?? {};
    if (localForgeBackendsStorage) {
      localForgeBackends = localForgeBackendsStorage;
    }
  })().catch((error) => {
    console.error(error);
  });
}

loadBackendsConfig();

// *** BACKENDS ***
const assetBackends: backends = {
  flux: {
    node: 'explorer.runonflux.io',
  },
  fluxTestnet: {
    node: 'testnet.runonflux.io',
  },
  rvn: {
    node: 'blockbookravencoin.app.runonflux.io',
  },
  ltc: {
    node: 'blockbooklitecoin.app.runonflux.io',
  },
  btc: {
    node: 'blockbookbitcoin.app.runonflux.io',
  },
  doge: {
    node: 'blockbookdogecoin.app.runonflux.io',
  },
  zec: {
    node: 'blockbookzcash.app.runonflux.io',
  },
  bch: {
    node: 'blockbookbitcoincash.app.runonflux.io',
  },
  btcTestnet: {
    node: 'blockbookbitcointestnet.app.runonflux.io',
  },
  btcSignet: {
    node: 'blockbookbitcoinsignet.app.runonflux.io',
  },
  sepolia: {
    node: 'node.ethereum-sepolia.runonflux.io',
    api: 'api.ethereum-sepolia.runonflux.io/api',
    explorer: 'sepolia.etherscan.io',
  },
  eth: {
    node: 'node.ethereum-mainnet.runonflux.io',
    api: 'api.ethereum-mainnet.runonflux.io/api',
    explorer: 'etherscan.io',
  },
};

export function backends() {
  const backendKeys = Object.keys(assetBackends);
  const currentBackends: backends = backendKeys.reduce((acc, key) => {
    acc[key] = localForgeBackends[key] || assetBackends[key];
    return acc;
  }, {} as backends);
  return currentBackends;
}

export function backendsOriginal() {
  return assetBackends;
}
