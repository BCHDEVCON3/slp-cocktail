import clsx from 'clsx';
import React from 'react';
import {RadioGroup, Radio} from 'react-radio-group';
type RadioGroupProps = RadioGroup.RadioGroupProps;

export interface InlineRadioGroupProps<T extends string | number> extends RadioGroupProps {
  id: string;
  options: T[];
}

export default function InlineRadioGroup<T extends string | number>(props: InlineRadioGroupProps<T>) {
  const { className, id, options, selectedValue, ...restProps } = props;

  return (
    <RadioGroup
      {...restProps}
      className={clsx("w-full py-5 px-12 border border-white rounded flex justify-between", className)}
      id={id}
      selectedValue={selectedValue}
    >
      {options.map(option => (
        <>
          <Radio className="hidden" value={option} id={`${id}-${option}`} key={option} />
          <label
            className={clsx("px-1 cursor-pointer text-2xl", { 'text-orange-500': option === selectedValue })}
            htmlFor={`${id}-${option}`}
          >
            {option}
          </label>
        </>
      ))}
    </RadioGroup>
  );
}
