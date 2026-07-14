import type { ReactNode } from "react";

type HubPageTopBarProps = {
  children: ReactNode;
};

export function HubPageTopBar({ children }: HubPageTopBarProps) {
  return <div className="city-page__top-bar">{children}</div>;
}
