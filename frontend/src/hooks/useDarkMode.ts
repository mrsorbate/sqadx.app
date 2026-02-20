import { useEffect, useState } from 'react';

export function useDarkMode() {
  const [isDark, setIsDark] = useState(false);

  // Initialize from localStorage and system preference
  useEffect(() => {
    const savedMode = localStorage.getItem('dark-mode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const shouldBeDark = savedMode ? savedMode === 'true' : prefersDark;
    setIsDark(shouldBeDark);
    
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
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
