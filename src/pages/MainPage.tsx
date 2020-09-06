import React, {useCallback, useContext, useMemo, useState} from 'react';
import { useForm, Controller } from 'react-hook-form';
import './MainPage.css';
import WalletContext from "../utils/WalletContext";
import CustomModal from "../components/CustomModal";
import ShakeForm, {ShakeFormValues} from "../components/ShakeForm";
import {coinjoin} from "../index";

interface LoginFormValues {
  wif: string;
}

export default function MainPage() {
  const peersCount = 3;

  const { error, data, setError, setWalletData } = useContext(WalletContext);
  const [errorForModal, setErrorForModal] = useState<Error>();
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const handleLoginClick = useCallback(() => setIsLoginOpen(true), []);
  const handleLoginModalClose = useCallback(() => setIsLoginOpen(false), []);
  const handleErrorModalClose = useCallback(() => setErrorForModal(undefined), []);

  const {
    control: loginControl,
    handleSubmit: handleLoginSubmit
  } = useForm<LoginFormValues>({ defaultValues: { wif: "" } });

  const onLoginSubmit = useCallback(handleLoginSubmit(async (formData: LoginFormValues) => {
    setIsLoginOpen(false);
    try {
      const ecpair = coinjoin.bchjs.ECPair.fromWIF(formData.wif);
      const cashAddress = coinjoin.bchjs.ECPair.toCashAddress(ecpair);
      const { balance } = await coinjoin.getBCHBalance(cashAddress);
      console.log(await coinjoin.bchjs.SLP.Utils.balancesForAddress(cashAddress));
      setError(undefined);
      setWalletData({
        balance: Number(balance.confirmed) / 1e8,
        tokens: [],
        slpAddress: '',
        address: cashAddress
      });
    } catch (e) {
      setErrorForModal(e);
    }
  }), [setError, setWalletData]);

  const handleShakeFormSubmit = useCallback((formData: ShakeFormValues) => {
    if (data) {
      console.log(formData);
    } else {
      setErrorForModal(new Error('You should log in'));
    }
  }, [data]);

  const tokensOptions = useMemo(
    () => data
      ? data.tokens.map(({ id, symbol }) => ({ label: symbol, value: id }))
      : [{ label: 'WBTC', value: 'WBTC' }, { label: 'MAZE', value: 'MAZE' }],
    [data]
  );

  return (
    <div>
      <CustomModal
        className="w-full max-w-xl"
        isOpen={!!errorForModal}
        contentLabel="Error"
        onRequestClose={handleErrorModalClose}
      >
        <h1 className="p-3 text-center text-4xl">Error</h1>
        <p>{errorForModal?.message}</p>
      </CustomModal>

      <CustomModal
        className="w-full max-w-xl"
        isOpen={isLoginOpen}
        contentLabel="Login modal"
        onRequestClose={handleLoginModalClose}
      >
        <h1 className="p-3 text-center text-4xl">Login</h1>
        <form onSubmit={onLoginSubmit}>
          <div className="mb-3">
            <p className="mb-6 text-2xl">Your WIF</p>
            <Controller
              name="wif"
              render={({ name, value, onChange }) => (
                <input
                  className="w-full bg-transparent p-5 border border-white rounded text-xl"
                  name={name}
                  value={value}
                  onChange={onChange}
                  type="password"
                />
              )}
              control={loginControl}
              rules={{
                required: 'This field is required',
                pattern: {
                  value: /^[a-z0-9]{52}$/i,
                  message: 'Invalid WIF'
                }
              }}
            />
          </div>
          <div className="flex justify-center">
            <button className="bg-red-600 px-4 py-3 text-2xl rounded" type="submit">Login</button>
          </div>
        </form>
      </CustomModal>

      <header className="flex pl-10 pr-5">
        <div className="text-sm flex-1 mt-8">
          {data ? (
            <>
              <p>
                <span className="text-orange-500">Your</span> address:{' '}
                <span
                  className="inline-block w-20 overflow-hidden align-bottom"
                  style={{ textOverflow: 'ellipsis' }}
                >
                  {data.address.split(':')[1]}
                </span>
              </p>
              <p>BCH Balance: {data.balance} <span className="text-orange-500">BCH</span></p>
              <p>
                <span className="text-blue-500">Token Balance</span>:{' '}
                {data.tokens.length === 0
                  ? '-'
                  : data.tokens.map(({ balance, symbol }) => `${balance} ${symbol}`).join(', ')
                }
              </p>
              <p>Current <span className="text-orange-500">peers</span>: {peersCount}</p>
            </>
          ) : (
            <button className="bg-red-600 px-4 py-3 text-2xl rounded" onClick={handleLoginClick}>Login</button>
          )}
        </div>
        <div className="flex-none brand-name text-8xl mr-6 mt-10">
          <span className="text-blue-500">SLP.</span><span>Cocktail</span>
        </div>
        <img className="flex-none h-full" src="/logo.png" alt="Logo" />
      </header>
      {error && <div className="text-red-600 text-center p-4">{error.message}</div>}
      <div className="mt-10 mb-16 flex justify-evenly">
        <div className="w-4/12">
          <ShakeForm tokensOptions={tokensOptions} onSubmit={handleShakeFormSubmit} />
        </div>
        <div className="w-4/12 pt-12">
          <h1 className="text-5xl mt-2 mb-16">How it works</h1>
          <p className="text-lg mb-4">
            1. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam.
          </p>
          <p className="text-lg mb-4">
            2. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla.
          </p>
          <p className="text-lg">
            3. Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor!
          </p>
        </div>
      </div>
      <footer className="flex flex-col items-center p-4">
        <img className="mb-4" src="/github.png" alt="GitHub Logo" />
        <span>There is no privacy. Copyright is theft.</span>
      </footer>
    </div>
  );
}
