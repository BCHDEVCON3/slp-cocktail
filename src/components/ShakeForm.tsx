import React, {useCallback, useEffect, useRef} from 'react';
import {Controller, useForm} from "react-hook-form";
import CustomSelect, {CustomSelectProps} from "./CustomSelect";
import InlineRadioGroup from "./InlineRadioGroup";

export interface ShakeFormValues {
  address: string;
  token: string;
  amount: number;
  peers: number;
}

export interface ShakeFormProps {
  cancelFn?: () => void;
  tokensOptions: CustomSelectProps<string>['options'];
  onSubmit: (formValues: ShakeFormValues) => void;
}

export default function ShakeForm(props: ShakeFormProps) {
  const { cancelFn, tokensOptions, onSubmit } = props;

  const {
    control,
    getValues,
    setValue,
    handleSubmit
  } = useForm<ShakeFormValues>({
    defaultValues: { address: "", token: tokensOptions[0]?.value || "", amount: 10, peers: 5 }
  });

  const internalHandleSubmit = useCallback(handleSubmit(onSubmit), [handleSubmit, onSubmit]);

  const prevTokensOptions = useRef(tokensOptions);
  useEffect(() => {
    if (
      (prevTokensOptions.current !== tokensOptions) &&
      !tokensOptions.find(({ value }) => value === getValues('token'))
    ) {
      setValue('token', tokensOptions[0]?.value);
    }
    prevTokensOptions.current = tokensOptions;
  }, [getValues, setValue, tokensOptions]);

  return (
    <>
    <form onSubmit={internalHandleSubmit}>
      <div className="mb-6">
        <p className="mb-6 text-2xl">Token</p>
        <Controller
          name="token"
          render={({ name, value, onChange }) => (
            <CustomSelect id={name} options={tokensOptions} onChange={onChange} value={value} />
          )}
          control={control}
          rules={{ required: 'This field is required' }}
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
            <InlineRadioGroup id={name} options={[3, 5, 7, 9]} onChange={onChange} selectedValue={value} />
          )}
          control={control}
        />
      </div>

      <div className="mb-5">
        <p className="mb-6 text-2xl">Recepient address</p>
        <Controller
          name="address"
          render={({ name, value, onChange }) => (
            <input
              className="w-full bg-transparent p-5 border border-white rounded text-xl"
              name={name}
              value={value}
              onChange={onChange}
            />
          )}
          control={control}
          rules={{
            required: 'This field is required',
            pattern: {
              value: /^((slptest:)?(q|p)[a-z0-9]{41})/,
              message: 'Invalid address'
            }
          }}
        />
      </div>

      {!cancelFn && (
        <div className="mt-8 flex justify-center">
          <button className="bg-red-600 px-4 py-3 text-2xl rounded" type="submit">Shake it!</button>
        </div>
      )}
    </form>
    {cancelFn && (
      <div className="mt-8 flex justify-center">
        <button className="bg-red-600 px-4 py-3 text-2xl rounded" onClick={cancelFn}>Cancel</button>
      </div>
    )}
    </>
  );
}
