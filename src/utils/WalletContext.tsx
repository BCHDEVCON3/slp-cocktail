import React, {useEffect, useState} from 'react';
import BitcoinLink from "bitcoincom-link";
import axios from "axios";

const { WalletProviderStatus } = BitcoinLink.constants;

interface SlpBalanceItem {
  tokenId: string;
  balance: number;
  decimalCount: number;
}

interface RawTokenData {
  symbol: string;
  name: string;
  id: string;
}

export interface SlpToken {
  id: string;
  balance: number;
  symbol: string;
  name: string;
}

export interface WalletData {
  address: string;
  slpAddress: string;
  balance: number;
  tokens: SlpToken[];
}

export interface WalletContextValue {
  data?: WalletData;
  error?: Error;
}

const WalletContext = React.createContext<WalletContextValue>({});

export const WalletProvider = (props: { children: React.ReactNode | React.ReactNode[] }) => {
  const [error, setError] = useState<Error>();
  const [walletData, setWalletData] = useState<WalletData>();

  useEffect(() => {
    (async () => {
      const providerStatus = BitcoinLink.getWalletProviderStatus();
      if (Object.values(providerStatus).includes(WalletProviderStatus.LOGGED_IN)) {
        try {
          // @ts-ignore
          const { address } = await BitcoinLink.getAddress({protocol: 'BCH'});
          // @ts-ignore
          const { address: slpAddress } = await BitcoinLink.getAddress({protocol: 'SLP'});

          const balance = (await axios.get(
            `https://explorer.api.bitcoin.com/bch/v1/addr/\
bitcoincash%3A${address.split(':')[1]}?from=0&to=1000&noTxList=1`
          )).data.balance;
          const slpBalance: SlpBalanceItem[] = (await axios.get(
            `https://rest.bitcoin.com/v2/slp/balancesForAddress/${slpAddress}`
          )).data;
          const tokensData: RawTokenData[] = slpBalance.length > 0
            ? (await axios.post(`https://rest.bitcoin.com/v2/slp/list`, {
              tokensIds: slpBalance.map(slpToken => slpToken.tokenId)
            })).data
            : [];

          setWalletData({
            address,
            balance,
            slpAddress,
            tokens: slpBalance.map(({ tokenId, balance: tokenBalance }) => {
              const { symbol, name } = tokensData.find(token => token.id === tokenId)!;

              return {
                id: tokenId,
                balance: tokenBalance,
                symbol,
                name
              };
            })
          });
        } catch (e) {
          console.error(e);
          setError(e);
        }
      } else if (Object.values(providerStatus).includes(WalletProviderStatus.AVAILABLE)) {
        setError(new Error('You need to log in into your wallet'));
      } else {
        setError(new Error('You need to have Badger wallet installed'));
      }
    })();
  }, []);

  return (
    <WalletContext.Provider value={{ error, data: walletData }}>{props.children}</WalletContext.Provider>
  )
};

export default WalletContext;
