'use client';

import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_PROMPT_LAYERS, type PromptLayers } from '@/lib/promptDefaults';

const STORAGE_KEY = 'wc:prompt-settings';

export function usePromptSettings() {
  const [layers, setLayers] = useState<PromptLayers>(DEFAULT_PROMPT_LAYERS);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<PromptLayers>;
        setLayers({ ...DEFAULT_PROMPT_LAYERS, ...parsed });
        setIsDirty(true);
      }
    } catch {
      // Ignore parse errors — fall back to defaults
    }
  }, []);

  const save = useCallback((newLayers: PromptLayers) => {
    setLayers(newLayers);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newLayers));
    setIsDirty(true);
  }, []);

  const reset = useCallback(() => {
    setLayers(DEFAULT_PROMPT_LAYERS);
    localStorage.removeItem(STORAGE_KEY);
    setIsDirty(false);
  }, []);

  return { layers, save, reset, isDirty };
}
