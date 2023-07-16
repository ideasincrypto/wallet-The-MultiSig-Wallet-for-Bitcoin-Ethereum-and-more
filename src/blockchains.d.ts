declare module '@storage/blockchains' {
  interface Blockchain {
    id: string;
    name: string;
    symbol: string;
    decimals: number;
    explorer: string;
    slip: number;
    messagePrefix: string;
    pubKeyHash: string;
    scriptHash: string;
    wif: string;
    logo: string;
  }
  let blockchains: {
    flux: Blockchain;
    fluxTestnet: Blockchain;
  };
}
