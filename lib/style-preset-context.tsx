"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  StylePreset,
  STYLE_PRESETS,
  getStylePreset,
  getPresetCSSStyles,
} from "./style-presets";
import { getPaletteColors } from "./color-palette";

interface StylePresetContextValue {
  /** Current style preset */
  preset: StylePreset;
  /** Current preset ID */
  presetId: string;
  /** All available presets */
  availablePresets: StylePreset[];
  /** Change the active preset */
  setPreset: (presetId: string) => void;
  /** Get colors for the current preset */
  getColors: () => string[];
  /** Get CSS styles to apply */
  getCSSStyles: () => Record<string, string>;
}

const StylePresetContext = createContext<StylePresetContextValue | null>(null);

interface StylePresetProviderProps {
  children: ReactNode;
  /** Initial preset ID (default: "default") */
  initialPreset?: string;
}

export function StylePresetProvider({
  children,
  initialPreset = "default",
}: StylePresetProviderProps) {
  const [presetId, setPresetId] = useState(initialPreset);
  const preset = getStylePreset(presetId);

  const setPreset = useCallback((newPresetId: string) => {
    setPresetId(newPresetId);
  }, []);

  const getColors = useCallback(() => {
    return getPaletteColors(preset.colorPaletteId);
  }, [preset.colorPaletteId]);

  const getCSSStyles = useCallback(() => {
    return getPresetCSSStyles(preset);
  }, [preset]);

  return (
    <StylePresetContext.Provider
      value={{
        preset,
        presetId,
        availablePresets: STYLE_PRESETS,
        setPreset,
        getColors,
        getCSSStyles,
      }}
    >
      {children}
    </StylePresetContext.Provider>
  );
}

export function useStylePreset(): StylePresetContextValue {
  const context = useContext(StylePresetContext);
  if (!context) {
    throw new Error("useStylePreset must be used within a StylePresetProvider");
  }
  return context;
}

/**
 * Hook that returns only if style preset context is available
 * Safe to use in components that may or may not have the provider
 */
export function useStylePresetSafe(): StylePresetContextValue | null {
  return useContext(StylePresetContext);
}
