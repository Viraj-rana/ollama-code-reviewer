/**
 * Persistent Storage Utilities
 * Handles saving and loading history with code diffs to localStorage and Supabase
 */

import { HistoryEntry } from '../types';

const HISTORY_STORAGE_KEY = 'review_history';
const MAX_LOCALSTORAGE_SIZE = 5 * 1024 * 1024; // 5MB limit per entry in theory, but browser limit is ~10MB total

/**
 * Safely save history to localStorage with compression/truncation if needed
 */
export const saveHistoryToLocalStorage = (history: HistoryEntry[]): boolean => {
  try {
    const serialized = JSON.stringify(history);
    
    // Check if it fits
    if (serialized.length > MAX_LOCALSTORAGE_SIZE) {
      console.warn(`[Storage] History size ${serialized.length} bytes exceeds safe limit. Keeping last 50 entries.`);
      // Keep only recent 50 entries
      const trimmed = history.slice(0, 50);
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmed));
      return false;
    }
    
    localStorage.setItem(HISTORY_STORAGE_KEY, serialized);
    return true;
  } catch (error) {
    console.error('[Storage] Failed to save history to localStorage:', error);
    return false;
  }
};

/**
 * Load history from localStorage with fallback handling
 */
export const loadHistoryFromLocalStorage = (): HistoryEntry[] => {
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    
    // Ensure all entries have codeDiff field (backward compatibility)
    return parsed.map(entry => ({
      ...entry,
      codeDiff: entry.codeDiff || '' // Ensure field exists
    }));
  } catch (error) {
    console.error('[Storage] Failed to load history from localStorage:', error);
    return [];
  }
};

/**
 * Verify that a history entry has critical data
 */
export const validateHistoryEntry = (entry: HistoryEntry): boolean => {
  if (!entry.id || !entry.result) return false;
  
  // codeDiff is optional but useful
  if (!entry.codeDiff) {
    console.warn(`[Storage] History entry ${entry.id} missing codeDiff`);
  }
  
  return true;
};
