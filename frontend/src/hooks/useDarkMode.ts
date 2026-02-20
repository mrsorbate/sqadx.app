import { useEffect, useState } from 'react';

// Initialize dark mode synchronously before rendering
const getInitialDarkMode = () => {
  if (typeof window === 'undefined') return false;
  
  const savedMode = localStorage.getItem('dark-mode');
  if (savedMode !== null) {
    return savedMode === 'true';
  }
  
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

// Apply dark mode class immediately
const initialDarkMode = getInitialDarkMode();
if (initialDarkMode) {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

export function useDarkMode() {
  const [isDark, setIsDark] = useState(initialDarkMode);

  // Sync with localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('dark-mode');
    if (savedMode !== null) {
      const shouldBeDark = savedMode === 'true';
      setIsDark(shouldBeDark);
      
      if (shouldBeDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDark(prev => {
      const newState = !prev;
      localStorage.setItem('dark-mode', newState.toString());
      
      if (newState) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      return newState;
    });
  };

  return { isDark, toggleDarkMode };
}
