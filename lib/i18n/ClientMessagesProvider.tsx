"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useMessages } from "next-intl";
import enMessages from "@/messages/en.json";
import type { AppMessages } from "@/lib/i18n/message-catalog";

const MessagesContext = createContext<AppMessages>(enMessages);

/** Syncs next-intl request messages into client-messages consumers. */
export function ClientMessagesProvider({ children }: { children: ReactNode }) {
  const messages = useMessages() as AppMessages;
  return (
    <MessagesContext.Provider value={messages}>{children}</MessagesContext.Provider>
  );
}

export function useAppMessagesContext(): AppMessages {
  return useContext(MessagesContext);
}
