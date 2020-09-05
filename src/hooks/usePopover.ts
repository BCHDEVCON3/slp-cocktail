import * as React from "react";
import useOnClickOutside from "use-onclickoutside";

export default function usePopover(pinned = true) {
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const overRef = React.useRef(null);
  const [opened, setOpened] = React.useState(false);

  const handleTriggerClick = React.useCallback(() => {
    setOpened((o) => !o);
  }, [setOpened]);

  const handleClickOuside = React.useCallback(
    (evt) => {
      if (!(triggerRef.current && triggerRef.current.contains(evt.target))) {
        setOpened(false);
      }
    },
    [setOpened]
  );

  useOnClickOutside(overRef, opened ? handleClickOuside : null);

  React.useEffect(() => {
    if (opened && !pinned) {
      setOpened(false);
      if (triggerRef.current === document.activeElement) {
        triggerRef.current?.blur();
      }
    }
  }, [pinned, opened, setOpened]);

  return {
    triggerRef,
    overRef,
    opened,
    setOpened,
    handleTriggerClick,
  };
}
