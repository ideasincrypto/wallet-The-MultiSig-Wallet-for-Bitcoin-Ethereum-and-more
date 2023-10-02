import { useEffect, useRef, useState } from 'react';
import BigNumber from 'bignumber.js';
import localForage from 'localforage';
import { useAppSelector, useAppDispatch } from '../../hooks';
import { setBalance, setUnconfirmedBalance } from '../../store';
import { fetchAddressBalance } from '../../lib/balances.ts';
import SocketListener from '../SocketListener/SocketListener.tsx';

let refreshInterval: string | number | NodeJS.Timeout | undefined;

interface balancesObj {
  confirmed: string;
  unconfirmed: string;
}

const balancesObject = {
  confirmed: '0.00',
  unconfirmed: '0.00',
};

function Balances() {
  const alreadyMounted = useRef(false); // as of react strict mode, useEffect is triggered twice. This is a hack to prevent that without disabling strict mode
  const isInitialMount = useRef(true);
  const [fiatRate, setFiatRate] = useState(0);
  const dispatch = useAppDispatch();
  const { wallets, walletInUse } = useAppSelector((state) => state.flux);
  const { cryptoRates, fiatRates } = useAppSelector(
    (state) => state.fiatCryptoRates,
  );

  useEffect(() => {
    if (alreadyMounted.current) return;
    alreadyMounted.current = true;
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
    refreshInterval = setInterval(() => {
      refresh();
    }, 20000);
  });

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    refresh();
    void (async function () {
      const wInUse = walletInUse;
      const balancesFlux: balancesObj =
        (await localForage.getItem('balances-flux-' + wInUse)) ??
        balancesObject;
      if (balancesFlux) {
        dispatch(
          setBalance({
            wallet: wInUse,
            data: balancesFlux.confirmed,
          }),
        );
        dispatch(
          setUnconfirmedBalance({
            wallet: wInUse,
            data: balancesFlux.unconfirmed,
          }),
        );
      }
    })();
  }, [walletInUse]);

  const fetchBalance = () => {
    fetchAddressBalance(wallets[walletInUse].address, 'flux')
      .then(async (balance) => {
        dispatch(setBalance({ wallet: walletInUse, data: balance.confirmed }));
        dispatch(
          setUnconfirmedBalance({
            wallet: walletInUse,
            data: balance.unconfirmed,
          }),
        );
        await localForage.setItem('balances-flux-' + walletInUse, balance);
        console.log(balance);
      })
      .catch((error) => {
        console.log(error);
      });
  };

  const totalBalance = new BigNumber(wallets[walletInUse].balance)
    .plus(new BigNumber(wallets[walletInUse].unconfirmedBalance))
    .dividedBy(1e8);
  let balanceUSD = totalBalance.multipliedBy(new BigNumber(fiatRate));

  useEffect(() => {
    balanceUSD = totalBalance.multipliedBy(new BigNumber(fiatRate));
  }, [fiatRate]);

  const getCryptoRate = (
    crypto: keyof typeof cryptoRates,
    fiat: keyof typeof fiatRates,
  ) => {
    console.log(cryptoRates);
    const cr = cryptoRates[crypto];
    const fi = fiatRates[fiat];
    setFiatRate(cr * fi);
  };

  const refresh = () => {
    fetchBalance();
    getCryptoRate('flux', 'USD');
  };

  const onTxRejected = () => {
    // do nothing
  };

  const onTxSent = () => {
    setTimeout(() => {
      refresh();
    }, 2500);
    setTimeout(() => {
      refresh();
    }, 7500);
  };

  return (
    <>
      <h3 style={{ marginTop: 0, marginBottom: 10 }}>
        {totalBalance.toFixed(8) || '0.00'} FLUX
      </h3>
      <h4 style={{ marginTop: 0, marginBottom: 15 }}>
        ${balanceUSD.toFixed(2) || '0.00'} USD
      </h4>

      <SocketListener txRejected={onTxRejected} txSent={onTxSent} />
    </>
  );
}

export default Balances;
