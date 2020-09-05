import React from 'react';

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

export default WalletContext;
