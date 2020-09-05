import React, {useContext} from 'react';
import { useForm, Controller } from 'react-hook-form';
import './MainPage.css';
import InlineRadioGroup from "../components/InlineRadioGroup";
import CustomSelect from "../components/CustomSelect";
import WalletContext from "../utils/WalletContext";

interface ShakeFormValues {
  token: string;
  amount: number;
  peers: number;
}

export default function MainPage() {
  const peersCount = 3;

  const { error, data } = useContext(WalletContext);

  const {
    control,
    handleSubmit
  } = useForm<ShakeFormValues>({ defaultValues: { token: "WBTC", amount: 10, peers: 5 } });

  if (error) {
    return (
      <div className="p-10 text-center text-red-600">{error.message}</div>
    );
  }

  if (!data) {
    return (
      <div className="p-10 text-center">Please wait, loading...</div>
    );
  }

  return (
    <div>
      <header className="flex pl-10 pr-5">
        <div className="text-sm flex-1 mt-8">
          <p><span className="text-orange-500">
            Your</span> address: {data.address.split(':')[1].substr(0, 8)}…
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
        </div>
        <div className="flex-none brand-name text-8xl mr-6 mt-10">
          <span className="text-blue-500">SLP.</span><span>Cocktail</span>
        </div>
        <img className="flex-none h-full" src="/logo.png" alt="Logo" />
      </header>
      <div className="mt-10 mb-16 flex justify-evenly">
        <div className="w-4/12">
          <form onSubmit={handleSubmit(console.log)}>
            <div className="mb-6">
              <p className="mb-6 text-2xl">Token</p>
              <Controller
                name="token"
                render={({ name, value, onChange }) => (
                  <CustomSelect id={name} options={["WBTC", "MAZE", "Mistcoin"]} onChange={onChange} value={value} />
                )}
                control={control}
              />
            </div>

            <div className="mb-6">
              <p className="mb-6 text-2xl">Amount</p>
              <Controller
                name="amount"
                render={({ name, value, onChange }) => (
                  <InlineRadioGroup id={name} options={[1, 5, 10, 50]} onChange={onChange} selectedValue={value} />
                )}
                control={control}
              />
            </div>

            <div className="mb-5">
              <p className="mb-6 text-2xl">Peers</p>
              <Controller
                name="peers"
                render={({ name, value, onChange }) => (
                  <InlineRadioGroup id={name} options={[5, 7, 10, 15]} onChange={onChange} selectedValue={value} />
                )}
                control={control}
              />
            </div>

            <div className="mt-8 flex justify-center">
              <button className="bg-red-600 px-4 py-3 text-2xl rounded" type="submit">Shake it!</button>
            </div>
          </form>
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