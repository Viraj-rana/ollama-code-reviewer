/// <reference types="vite/client" />

/**
 * Secure Logger Utility
 * Only logs messages in development mode
 * Completely suppresses logs in production for security & privacy
 */

const isDev = (import.meta as any).env?.DEV ?? false;

export const debugLog = (message: string, ...args: any[]) => {
  if (isDev) {
    console.log(message, ...args);
  }
};

export const debugError = (message: string, ...args: any[]) => {
  if (isDev) {
    console.error(message, ...args);
  }
};

export const debugWarn = (message: string, ...args: any[]) => {
  if (isDev) {
    console.warn(message, ...args);
  }
};
