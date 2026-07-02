import React, { createContext, useContext, useState } from 'react';

/**
 * Global chat open/close state so the ChatWidget can be triggered from anywhere
 * (e.g., Profile → Help & Support).
 */
const ChatContext = createContext({ open: false, openChat: () => {}, closeChat: () => {} });

export const ChatProvider = ({ children }) => {
  const [open, setOpen] = useState(false);
  return (
    <ChatContext.Provider value={{ open, openChat: () => setOpen(true), closeChat: () => setOpen(false), setOpen }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
