import { useCallback, useRef, type MouseEvent, type PointerEvent } from "react";

const PRESS_FLASH_MS = 160;

export function flashTapPress(target: HTMLElement) {
  target.classList.add("is-pressed");

  const cleanup = () => {
    target.classList.remove("is-pressed");
  };

  target.addEventListener("pointerup", cleanup, { once: true });
  target.addEventListener("pointercancel", cleanup, { once: true });
  window.setTimeout(cleanup, PRESS_FLASH_MS);
}

export function tapPressProps(disabled = false) {
  return {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (disabled || event.button !== 0) return;
      flashTapPress(event.currentTarget);
    },
  };
}

/** * Touch/pen: fire on pointerdown (instant). Mouse/keyboard: fire on click.
 * Skips duplicate click after pointerdown on touch devices.
 */
export function useInstantAction(action: () => void) {
  const actionRef = useRef(action);
  actionRef.current = action;

  const skipClickRef = useRef(false);

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    const type = event.pointerType;
    if (type !== "touch" && type !== "pen") return;

    event.preventDefault();
    skipClickRef.current = true;
    flashTapPress(event.currentTarget);
    actionRef.current();

    window.setTimeout(() => {
      skipClickRef.current = false;
    }, 500);
  }, []);

  const onClick = useCallback((event: MouseEvent<HTMLElement>) => {
    if (skipClickRef.current) {
      event.preventDefault();
      return;
    }
    flashTapPress(event.currentTarget);
    actionRef.current();
  }, []);

  return { onPointerDown, onClick };
}
