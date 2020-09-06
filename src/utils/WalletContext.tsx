import React, {useState} from 'react';

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
  setError: (error?: Error) => void;
  setWalletData: (walletData?: WalletData) => void;
}

const WalletContext = React.createContext<WalletContextValue>({
  setError: () => {},
  setWalletData: () => {}
});

export const WalletProvider = (props: { children: React.ReactNode | React.ReactNode[] }) => {
  const [error, setError] = useState<Error>();
  const [walletData, setWalletData] = useState<WalletData>();

  return (
    <WalletContext.Provider value={{ error, data: walletData, setError, setWalletData }}>
      {props.children}
    </WalletContext.Provider>
  )
};

export default WalletContext;
