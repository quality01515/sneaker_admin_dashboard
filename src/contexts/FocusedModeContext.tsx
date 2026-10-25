import { createContext, FC, useContext, useState } from 'react';

const STORAGE_KEY = 'vanish_focused_mode';

type FocusedModeContextType = {
  focused: boolean;
  toggleFocused: () => void;
};

export const FocusedModeContext = createContext<FocusedModeContextType>({
  focused: false,
  toggleFocused: () => {},
});

export const FocusedModeProvider: FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [focused, setFocused] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
  });

  const toggleFocused = () => {
    setFocused((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  };

  return (
    <FocusedModeContext.Provider value={{ focused, toggleFocused }}>
      {children}
    </FocusedModeContext.Provider>
  );
};

export const useFocusedMode = () => useContext(FocusedModeContext);
