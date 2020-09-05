import React from 'react';
import './MainPage.css';

export default function MainPage() {
  const bthAddress = 'qzs02v05l';
  const bchBalance = 1.1;
  const tokenBalance = 15;
  const tokenSymbol = 'WBTC';
  const peersCount = 3;

  return (
    <div>
      <header className="flex items-center pl-10 pr-5">
        <div className="flex-1">
          <div className="text-sm">
            <p><span className="text-orange-500">Your</span> address: {bthAddress.substr(0, 8)}…</p>
            <p>BCH Balance: {bchBalance} <span className="text-orange-500">BCH</span></p>
            <p><span className="text-blue-500">Token Balance</span>: {tokenBalance} {tokenSymbol}</p>
            <p>Current <span className="text-orange-500">peers</span>: {peersCount}</p>
          </div>
        </div>
        <div className="flex-none brand-name mt-16 text-8xl mr-6">
          <span className="text-blue-500">SLP.</span><span>Cocktail</span>
        </div>
        <img className="flex-none" src="/logo.png" alt="Logo" />
      </header>
    </div>
  );
}