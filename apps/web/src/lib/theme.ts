/** Where the chosen light/dark mode is remembered. Kept outside the finealth.v1.* data keys so backups never carry it. */
export const THEME_KEY = 'finealth.theme';

/**
 * Runs in <head> before the first paint, so a saved choice never flashes the other mode.
 * With no saved choice the page follows the device (prefers-color-scheme in globals.css).
 */
export const THEME_BOOT = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;
