(function() {
  try {
    const theme = localStorage.getItem('ui-storage') || 'system';
    const storage = JSON.parse(theme);
    const userTheme = storage?.state?.theme;
    const isDark = userTheme === 'dark' ||
      (userTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {
    // Fallback: utiliser system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }
})();
