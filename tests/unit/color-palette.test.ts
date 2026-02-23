import { describe, it, expect } from "vitest";
import {
  COLOR_PALETTES,
  getPalette,
  getPaletteColors,
  getColorFromPalette,
  generateColorScale,
} from "@/lib/color-palette";

describe("color-palette", () => {
  describe("COLOR_PALETTES", () => {
    it("has expected number of palettes", () => {
      expect(COLOR_PALETTES.length).toBeGreaterThanOrEqual(10);
    });

    it("each palette has id, name, colors, and description", () => {
      for (const palette of COLOR_PALETTES) {
        expect(palette).toHaveProperty("id");
        expect(palette).toHaveProperty("name");
        expect(palette).toHaveProperty("colors");
        expect(palette).toHaveProperty("description");
        expect(Array.isArray(palette.colors)).toBe(true);
        expect(palette.colors.length).toBeGreaterThan(0);
      }
    });

    it("each palette color is a valid hex color", () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

      for (const palette of COLOR_PALETTES) {
        for (const color of palette.colors) {
          expect(color).toMatch(hexColorRegex);
        }
      }
    });

    it("has default palette", () => {
      const defaultPalette = COLOR_PALETTES.find(p => p.id === "default");
      expect(defaultPalette).toBeDefined();
    });

    it("has expected palette types", () => {
      const expectedPalettes = [
        "default",
        "corporate",
        "nature",
        "ocean",
        "sunset",
        "berry",
        "monochrome",
        "rainbow",
        "pastel",
        "bold",
      ];

      for (const paletteId of expectedPalettes) {
        const palette = COLOR_PALETTES.find(p => p.id === paletteId);
        expect(palette).toBeDefined();
      }
    });
  });

  describe("getPalette", () => {
    it("returns palette for valid id", () => {
      const palette = getPalette("ocean");
      expect(palette.id).toBe("ocean");
    });

    it("returns default palette for invalid id", () => {
      const palette = getPalette("nonexistent");
      expect(palette.id).toBe("default");
    });

    it("returns palette with all properties", () => {
      const palette = getPalette("default");
      expect(palette).toHaveProperty("id");
      expect(palette).toHaveProperty("name");
      expect(palette).toHaveProperty("colors");
      expect(palette).toHaveProperty("description");
    });
  });

  describe("getPaletteColors", () => {
    it("returns colors for valid palette id", () => {
      const colors = getPaletteColors("default");
      expect(Array.isArray(colors)).toBe(true);
      expect(colors.length).toBeGreaterThan(0);
    });

    it("returns default colors for invalid palette id", () => {
      const colors = getPaletteColors("nonexistent");
      const defaultColors = getPaletteColors("default");
      expect(colors).toEqual(defaultColors);
    });

    it("returns different colors for different palettes", () => {
      const defaultColors = getPaletteColors("default");
      const oceanColors = getPaletteColors("ocean");
      expect(defaultColors).not.toEqual(oceanColors);
    });
  });

  describe("getColorFromPalette", () => {
    it("returns color at specified index", () => {
      const colors = getPaletteColors("default");
      const color = getColorFromPalette("default", 0);
      expect(color).toBe(colors[0]);
    });

    it("cycles colors for index out of range", () => {
      const colors = getPaletteColors("default");
      const colorAtLength = getColorFromPalette("default", colors.length);
      expect(colorAtLength).toBe(colors[0]);
    });

    it("handles large indices", () => {
      const colors = getPaletteColors("default");
      const color = getColorFromPalette("default", 100);
      expect(color).toBe(colors[100 % colors.length]);
    });
  });

  describe("generateColorScale", () => {
    it("generates specified number of steps", () => {
      const scale = generateColorScale("#3b82f6", 5);
      expect(scale).toHaveLength(5);
    });

    it("generates valid hex colors", () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      const scale = generateColorScale("#3b82f6", 5);

      for (const color of scale) {
        expect(color).toMatch(hexColorRegex);
      }
    });

    it("starts with white and ends with base color", () => {
      const baseColor = "#3b82f6";
      const scale = generateColorScale(baseColor, 5);

      // First color should be white or close to it
      expect(scale[0]).toBe("#ffffff");
      // Last color should be the base color
      expect(scale[scale.length - 1]?.toLowerCase()).toBe(baseColor.toLowerCase());
    });

    it("defaults to 5 steps", () => {
      const scale = generateColorScale("#3b82f6");
      expect(scale).toHaveLength(5);
    });
  });

  describe("palette color counts", () => {
    it("each palette has at least 6 colors", () => {
      for (const palette of COLOR_PALETTES) {
        expect(palette.colors.length).toBeGreaterThanOrEqual(6);
      }
    });
  });
});
