import utxolib from '@runonflux/utxo-lib';
import { Buffer } from 'buffer';
import { HDKey } from '@scure/bip32';
import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import {
  keyPair,
  minHDKey,
  multisig,
  xPrivXpub,
  cryptos,
  externalIdentity,
} from '../types';
import { blockchains } from '@storage/blockchains';

export function getLibId(chain: keyof cryptos): string {
  return blockchains[chain].libid;
}

export function getScriptType(type: string): number {
  switch (type) {
    case 'p2sh':
      return 0;
    case 'p2sh-p2wsh':
      return 1;
    case 'p2wsh':
      return 2;
    default:
      return 0;
  }
}

function generatexPubxPriv(
  mnemonic: string,
  bip = 48,
  coin: number,
  account = 0,
  type = 'p2sh',
  chain: keyof cryptos,
): xPrivXpub {
  const scriptType = getScriptType(type);

  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const bipParams = blockchains[chain].bip32;
  const masterKey = HDKey.fromMasterSeed(seed, bipParams);
  const externalChain = masterKey.derive(
    `m/${bip}'/${coin}'/${account}'/${scriptType}'`,
  );
  return externalChain.toJSON();
}

// generate random mnemonic provided strength
export function generateMnemonic(strength: 128 | 256 = 256): string {
  return bip39.generateMnemonic(wordlist, strength);
}

export function validateMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic, wordlist);
}

// returns xpub of hardened derivation path for a particular coin
export function getMasterXpub(
  mnemonic: string,
  bip = 48,
  coin: number,
  account = 0,
  type = 'p2sh',
  chain: keyof cryptos,
): string {
  const xPubxPriv = generatexPubxPriv(
    mnemonic,
    bip,
    coin,
    account,
    type,
    chain,
  );
  return xPubxPriv.xpub;
}

// returns xpriv of hardened derivation path for a particular coin
export function getMasterXpriv(
  mnemonic: string,
  bip = 48,
  coin: number,
  account = 0,
  type = 'p2sh',
  chain: keyof cryptos,
): string {
  const xPubxPriv = generatexPubxPriv(
    mnemonic,
    bip,
    coin,
    account,
    type,
    chain,
  );
  return xPubxPriv.xpriv;
}

// given xpubs of two parties, generate multisig address and its redeem script
export function generateMultisigAddress(
  xpub1: string,
  xpub2: string,
  typeIndex: 0 | 1 | 10, // normal, change, internal identity
  addressIndex: number,
  chain: keyof cryptos,
): multisig {
  const libID = getLibId(chain);
  const network = utxolib.networks[libID];
  const bipParams = blockchains[chain].bip32;
  const type = blockchains[chain].scriptType;
  const networkBipParams = utxolib.networks[libID].bip32;
  let externalChain1, externalChain2;
  try {
    externalChain1 = HDKey.fromExtendedKey(xpub1, bipParams);
  } catch (e) {
    externalChain1 = HDKey.fromExtendedKey(xpub1, networkBipParams);
  }
  try {
    externalChain2 = HDKey.fromExtendedKey(xpub2, bipParams);
  } catch (e) {
    externalChain2 = HDKey.fromExtendedKey(xpub2, networkBipParams);
  }

  const externalAddress1 = externalChain1
    .deriveChild(typeIndex)
    .deriveChild(addressIndex);
  const externalAddress2: HDKey = externalChain2
    .deriveChild(typeIndex)
    .deriveChild(addressIndex);

  const publicKey1 = externalAddress1.publicKey;
  const publicKey2 = externalAddress2.publicKey;
  const pubKeyBuffer1 = Buffer.from(publicKey1!).toString('hex');
  const pubKeyBuffer2 = Buffer.from(publicKey2!).toString('hex');

  const sortedPublicKeys: string[] = [pubKeyBuffer1, pubKeyBuffer2].sort();
  const publicKeysBuffer: Buffer[] = sortedPublicKeys.map((hex: string) =>
    Buffer.from(hex, 'hex'),
  );

  if (type === 'p2wsh') {
    const witnessScript = utxolib.script.multisig.output.encode(
      2,
      publicKeysBuffer,
    );
    const scriptPubKey = utxolib.script.witnessScriptHash.output.encode(
      utxolib.crypto.sha256(witnessScript),
    );
    const address = utxolib.address.fromOutputScript(scriptPubKey, network);
    const witnessScriptHex: string = Buffer.from(witnessScript).toString('hex');
    return {
      address,
      witnessScript: witnessScriptHex,
    };
  } else if (type === 'p2sh-p2wsh') {
    const witnessScript = utxolib.script.multisig.output.encode(
      2,
      publicKeysBuffer,
    );
    const redeemScript = utxolib.script.witnessScriptHash.output.encode(
      utxolib.crypto.sha256(witnessScript),
    );
    const scriptPubKey = utxolib.script.scriptHash.output.encode(
      utxolib.crypto.hash160(redeemScript),
    );
    const address = utxolib.address.fromOutputScript(scriptPubKey, network);
    const witnessScriptHex: string = Buffer.from(witnessScript).toString('hex');
    const redeemScriptHex: string = Buffer.from(redeemScript).toString('hex');
    return {
      address,
      redeemScript: redeemScriptHex,
      witnessScript: witnessScriptHex,
    };
  } else {
    // p2sh
    const redeemScript: Uint8Array = utxolib.script.multisig.output.encode(
      2,
      publicKeysBuffer,
    );
    const scriptPubKey = utxolib.script.scriptHash.output.encode(
      utxolib.crypto.hash160(redeemScript),
    );

    const address: string = utxolib.address.fromOutputScript(
      scriptPubKey,
      network,
    );

    const redeemScriptHex: string = Buffer.from(redeemScript).toString('hex');
    return {
      address,
      redeemScript: redeemScriptHex,
    };
  }
}

// given xpriv of our party, generate keypair consisting of privateKey in WIF format and public key belonging to it
export function generateAddressKeypair(
  xpriv: string,
  typeIndex: 0 | 1,
  addressIndex: number,
  chain: keyof cryptos,
): keyPair {
  const libID = getLibId(chain);
  const bipParams = blockchains[chain].bip32;
  const networkBipParams = utxolib.networks[libID].bip32;
  let externalChain;
  let network = utxolib.networks[libID];
  try {
    externalChain = HDKey.fromExtendedKey(xpriv, bipParams);
    network = Object.assign({}, network, {
      bip32: bipParams,
    });
  } catch (e) {
    externalChain = HDKey.fromExtendedKey(xpriv, networkBipParams);
  }

  const externalAddress = externalChain
    .deriveChild(typeIndex)
    .deriveChild(addressIndex);

  const derivedExternalAddress: minHDKey = utxolib.HDNode.fromBase58(
    externalAddress.toJSON().xpriv,
    network,
  );

  const privateKeyWIF: string = derivedExternalAddress.keyPair.toWIF();

  const publicKey = derivedExternalAddress.keyPair
    .getPublicKeyBuffer()
    .toString('hex');

  return { privKey: privateKeyWIF, pubKey: publicKey };
}

// given xpub of our party, generate address of identity of xpub. INTERNAL SSP
export function generateInternalIdentityAddress(
  xpub: string,
  chain: keyof cryptos,
): string {
  const typeIndex = 10; // identity index
  const addressIndex = 0; // identity index

  const libID = getLibId(chain);
  const bipParams = blockchains[chain].bip32;
  const networkBipParams = utxolib.networks[libID].bip32;
  let externalChain;
  try {
    externalChain = HDKey.fromExtendedKey(xpub, bipParams);
  } catch (e) {
    externalChain = HDKey.fromExtendedKey(xpub, networkBipParams);
  }

  const externalAddress = externalChain
    .deriveChild(typeIndex)
    .deriveChild(addressIndex);

  const publicKey = externalAddress.publicKey;
  const pubKeyBuffer = Buffer.from(publicKey!);

  const network = utxolib.networks[libID];

  const genKeypair = utxolib.ECPair.fromPublicKeyBuffer(pubKeyBuffer, network);
  const address = genKeypair.getAddress();

  return address;
}

// given xpub of our party, generate address of identity of xpub. EXTERNAL PUBLIC SSP WALLET ID. Uses identity slip for xpub derivation path
export function generateExternalIdentityAddress(xpub: string): string {
  const chain = 'btc' as keyof cryptos;
  const typeIndex = 11; // identity index
  const addressIndex = 0; // identity index

  const libID = getLibId(chain);
  const bipParams = blockchains[chain].bip32;
  const networkBipParams = utxolib.networks[libID].bip32;
  let externalChain;
  try {
    externalChain = HDKey.fromExtendedKey(xpub, bipParams);
  } catch (e) {
    externalChain = HDKey.fromExtendedKey(xpub, networkBipParams);
  }

  const externalAddress = externalChain
    .deriveChild(typeIndex)
    .deriveChild(addressIndex);

  const publicKey = externalAddress.publicKey;
  const pubKeyBuffer = Buffer.from(publicKey!);

  const network = utxolib.networks[libID];

  const genKeypair = utxolib.ECPair.fromPublicKeyBuffer(pubKeyBuffer, network);
  const address = genKeypair.getAddress();

  return address;
}

// given xpriv of our party, generate keypair consisting of privateKey in WIF format and public key belonging to it for Node Identity.. Comprossed
export function generateNodeIdentityKeypair(
  xpriv: string,
  typeIndex: 11 | 12,
  addressIndex: number,
  chain: keyof cryptos,
): keyPair {
  const libID = getLibId(chain);
  const bipParams = blockchains[chain].bip32;
  const networkBipParams = utxolib.networks[libID].bip32;
  let externalChain;
  let network = utxolib.networks[libID];
  try {
    externalChain = HDKey.fromExtendedKey(xpriv, bipParams);
    network = Object.assign({}, network, {
      bip32: bipParams,
    });
  } catch (e) {
    externalChain = HDKey.fromExtendedKey(xpriv, networkBipParams);
  }

  const externalAddress = externalChain
    .deriveChild(typeIndex)
    .deriveChild(addressIndex);

  const derivedExternalAddress: minHDKey = utxolib.HDNode.fromBase58(
    externalAddress.toJSON().xpriv,
    network,
  );

  const privateKeyWIF: string = derivedExternalAddress.keyPair.toWIF();

  const publicKey = derivedExternalAddress.keyPair
    .getPublicKeyBuffer()
    .toString('hex');

  return { privKey: privateKeyWIF, pubKey: publicKey };
}

// given xpub of our party, generate keypair for our SSP Wallet Identity - this is a p2pkh bitcoin address used by thrid parties. SspId (same as FluxID)
export function generateExternalIdentityKeypair( // in memory we store just address
  xpriv: string,
): externalIdentity {
  const chain = 'btc' as keyof cryptos;
  const typeIndex = 11; // identity index
  const addressIndex = 0; // identity index
  const identityKeypair = generateNodeIdentityKeypair(
    xpriv,
    typeIndex,
    addressIndex,
    chain,
  );

  const pubKeyBuffer = Buffer.from(identityKeypair.pubKey, 'hex');
  const libID = getLibId(chain);
  const network = utxolib.networks[libID];

  const genKeypair = utxolib.ECPair.fromPublicKeyBuffer(pubKeyBuffer, network);
  const address = genKeypair.getAddress();

  const externalIdentity = {
    privKey: identityKeypair.privKey,
    pubKey: identityKeypair.pubKey,
    address,
  };
  return externalIdentity;
}

// from private key in wif format, get private key in hex format
export function wifToPrivateKey(
  privateKey: string,
  chain: keyof cryptos,
): string {
  const libID = getLibId(chain);
  const network = utxolib.networks[libID];
  const keyPair = utxolib.ECPair.fromWIF(privateKey, network);
  const pk = keyPair.getPrivateKeyBuffer().toString('hex');
  return pk;
}
