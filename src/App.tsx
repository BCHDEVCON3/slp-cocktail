import React from 'react';
import {LocationProvider} from "woozie";
import PageRouter from "./pages/PageRouter";
import { WalletProvider } from "./utils/WalletContext";

function App() {
  return (
    <WalletProvider>
      <LocationProvider>
        <PageRouter />
      </LocationProvider>
    </WalletProvider>
  );
}

export default App;
