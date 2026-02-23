import { describe, it, expect } from "vitest";
import {
  STYLE_PRESETS,
  getStylePreset,
  getPresetCSSStyles,
} from "@/lib/style-presets";

describe("style-presets", () => {
  describe("STYLE_PRESETS", () => {
    it("has at least the default preset", () => {
      expect(STYLE_PRESETS.length).toBeGreaterThan(0);
      const defaultPreset = STYLE_PRESETS.find((p) => p.id === "default");
      expect(defaultPreset).toBeDefined();
    });

    it("each preset has required fields", () => {
      for (const preset of STYLE_PRESETS) {
        expect(preset.id).toBeTruthy();
        expect(preset.name).toBeTruthy();
        expect(preset.description).toBeTruthy();
        expect(preset.colorPaletteId).toBeTruthy();
        expect(preset.headingFont).toBeTruthy();
        expect(preset.bodyFont).toBeTruthy();
        expect(preset.baseFontSize).toBeGreaterThan(0);
        expect(preset.chartStyle).toBeDefined();
        expect(preset.chartStyle.gridStyle).toBeTruthy();
        expect(preset.chartStyle.gridOpacity).toBeDefined();
      }
    });

    it("has all expected presets", () => {
      const presetIds = STYLE_PRESETS.map((p) => p.id);
      expect(presetIds).toContain("default");
      expect(presetIds).toContain("corporate");
      expect(presetIds).toContain("academic");
      expect(presetIds).toContain("research");
      expect(presetIds).toContain("startup");
      expect(presetIds).toContain("minimal");
      expect(presetIds).toContain("nature");
    });
  });

  describe("getStylePreset", () => {
    it("returns the correct preset by ID", () => {
      const corporate = getStylePreset("corporate");
      expect(corporate.id).toBe("corporate");
      expect(corporate.name).toBe("Corporate");
    });

    it("returns default preset for unknown ID", () => {
      const unknown = getStylePreset("non-existent-preset");
      expect(unknown.id).toBe("default");
    });
  });

  describe("getPresetCSSStyles", () => {
    it("returns CSS variables for a preset", () => {
      const preset = getStylePreset("default");
      const styles = getPresetCSSStyles(preset);

      expect(styles["--heading-font"]).toBeDefined();
      expect(styles["--body-font"]).toBeDefined();
      expect(styles["--base-font-size"]).toBeDefined();
      expect(styles["--chart-grid-opacity"]).toBeDefined();
      expect(styles["--chart-bar-radius"]).toBeDefined();
    });

    it("includes custom CSS variables when defined", () => {
      const darkMode = getStylePreset("dark-mode");
      const styles = getPresetCSSStyles(darkMode);

      expect(styles["--chart-grid-color"]).toBeDefined();
    });

    it("returns numeric values as strings", () => {
      const preset = getStylePreset("default");
      const styles = getPresetCSSStyles(preset);

      expect(typeof styles["--chart-grid-opacity"]).toBe("string");
      expect(typeof styles["--chart-value-font-weight"]).toBe("string");
    });
  });
});
