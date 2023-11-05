declare module 'flux-sdk' {
  let fluxnode: {
    startFluxNodev6: (
      collateralOutHash: string,
      collateralOutIndex: number,
      collateralPrivateKey: string,
      fluxnodePrivateKey: string,
      timestamp: string,
      comprossedCollateralPrivateKey: boolean,
      compressedFluxnodePrivateKey: boolean,
      redeemScript: string,
    ) => void;
  }
}
