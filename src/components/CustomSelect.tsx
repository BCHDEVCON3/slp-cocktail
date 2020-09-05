import React, {useCallback} from 'react';
import clsx from "clsx";
import usePopover from "../hooks/usePopover";

export interface CustomSelectProps<T extends string | number> {
  id: string;
  options: {label: string | number; value: T}[];
  onChange: (newValue: T) => void;
  value?: T;
}

interface CustomSelectOptionProps<T extends string | number> {
  active: boolean;
  inputId: string;
  label: string | number;
  onClick: (newValue: T) => void;
  value: T;
}

const CustomSelectOption = <T extends string | number>(props: CustomSelectOptionProps<T>) => {
  const { active, inputId, label, onClick, value } = props;

  const handleClick = useCallback(() => {
    if (!active) {
      onClick(value);
    }
  }, [active, onClick, value]);


  return (
    <li
      id={`${inputId}-item-${value}`}
      role="option"
      aria-selected={active}
      className="cursor-default select-none relative p-5 text-xl"
      onClick={handleClick}
    >
      <div className="flex justify-center">
        {label}
      </div>
    </li>
  );
}

export default function CustomSelect<T extends string | number>(props: CustomSelectProps<T>) {
  const { id, options, onChange, value } = props;

  const {
    triggerRef,
    overRef,
    opened,
    setOpened,
    handleTriggerClick,
  } = usePopover();

  const handleOptionClick = useCallback((value: T) => {
    setOpened(false);
    onChange(value);
  }, [setOpened, onChange]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded="true"
        className="w-full p-5 border border-white text-blue-500 text-2xl underline rounded relative"
        onClick={handleTriggerClick}
      >
        {options.find(({ value: optionValue }) => optionValue === value)?.label}
      </button>

      <div
        ref={overRef}
        className={clsx(
          "absolute block mt-1 w-full rounded-md bg-white shadow-lg z-20 border border-gray-500",
          !opened && "hidden"
        )}
      >
        <ul
          tabIndex={-1}
          role="listbox"
          className="py-1 overflow-auto text-base rounded-md shadow-xs bg-gray-900"
            style={{ maxHeight: "14rem" }}
          >
            {options.map(({ label, value: optionValue }) => (
              <CustomSelectOption
                active={optionValue === value}
                inputId={id}
                key={optionValue}
                label={label}
                value={optionValue}
                onClick={handleOptionClick}
              />
            ))}
          </ul>
      </div>
    </div>
  );
}