export type FixedMenuPosition = {
  top: number;
  right: number;
};

const MENU_GAP_PX = 8;
const MENU_MIN_INSET_PX = 12;

export function getFixedMenuBelowPosition(anchor: HTMLElement): FixedMenuPosition {
  const rect = anchor.getBoundingClientRect();
  const viewportWidth = window.visualViewport?.width ?? window.innerWidth;

  return {
    top: rect.bottom + MENU_GAP_PX,
    right: Math.max(MENU_MIN_INSET_PX, viewportWidth - rect.right),
  };
}
