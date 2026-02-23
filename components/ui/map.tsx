"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { type ComponentRenderProps } from "@json-render/react";
import { useData } from "@json-render/react";
import { getByPath } from "@json-render/core";
import { ChartActions } from "./chart-actions";
import { FullscreenModal } from "./fullscreen-modal";
import {
  exportToPng,
  exportToCsv,
  copyToClipboard,
  sanitizeFilename,
} from "@/lib/export-utils";
import {
  useDrillDownOptional,
  filterRowsByDimension,
} from "@/lib/drill-down-context";
import {
  GEO_DATA_URLS,
  normalizeRegionName,
  US_STATE_CODES,
} from "@/lib/geo-data";

// MapLibre type imports - dynamic import to avoid SSR issues
type MapLibreMap = {
  remove: () => void;
  on: (event: string, callback: (e: unknown) => void) => void;
  addSource: (id: string, source: unknown) => void;
  addLayer: (layer: unknown) => void;
  getSource: (id: string) => unknown;
  flyTo: (options: unknown) => void;
  getCanvas: () => HTMLCanvasElement;
  fitBounds: (bounds: [[number, number], [number, number]], options: { padding: number }) => void;
};

/**
 * Fullscreen Map component - renders a separate map instance for fullscreen view
 */
function FullscreenMap({
  variant,
  geoType,
  regionValues,
  points,
  colors,
  getColor,
  minValue,
  maxValue,
}: {
  variant: "choropleth" | "points";
  geoType: "us-states" | "world" | null | undefined;
  regionValues: Map<string, number>;
  points: Array<{ lat: number; lng: number; label: string; value: number }>;
  colors: string[];
  getColor: (value: number) => string;
  minValue: number;
  maxValue: number;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    let mounted = true;

    const initMap = async () => {
      try {
        const maplibregl = await import("maplibre-gl");

        if (!mounted || !mapContainerRef.current) return;

        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }

        const map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: {
            version: 8,
            sources: {
              osm: {
                type: "raster",
                tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                tileSize: 256,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
              },
            },
            layers: [{ id: "osm", type: "raster", source: "osm" }],
          },
          center: geoType === "us-states" ? [-98, 38] : [0, 20],
          zoom: geoType === "us-states" ? 3.5 : 1.5,
        });

        mapRef.current = map as unknown as MapLibreMap;

        map.on("load", async () => {
          if (!mounted) return;

          if (variant === "choropleth") {
            const geoJsonUrl = geoType === "us-states" ? GEO_DATA_URLS.usStates : GEO_DATA_URLS.worldCountries;

            try {
              const response = await fetch(geoJsonUrl);
              if (!response.ok) throw new Error("Failed to load GeoJSON");
              const geoJson = await response.json();

              if (geoJson.features) {
                for (const feature of geoJson.features) {
                  const name = feature.properties?.name || feature.properties?.NAME || feature.properties?.ADMIN || "";
                  const value = regionValues.get(name) || regionValues.get(normalizeRegionName(name)) || 0;
                  feature.properties.value = value;
                  feature.properties.color = value > 0 ? getColor(value) : "#f0f0f0";
                }
              }

              map.addSource("regions", { type: "geojson", data: geoJson });
              map.addLayer({
                id: "regions-fill",
                type: "fill",
                source: "regions",
                paint: { "fill-color": ["get", "color"], "fill-opacity": 0.7 },
              });
              map.addLayer({
                id: "regions-outline",
                type: "line",
                source: "regions",
                paint: { "line-color": "#666", "line-width": 0.5 },
              });

              map.on("mousemove", "regions-fill", (e: unknown) => {
                const event = e as { features?: Array<{ properties?: { name?: string; NAME?: string; ADMIN?: string; value?: number } }>; point?: { x: number; y: number } };
                const feature = event.features?.[0];
                if (feature && event.point) {
                  const name = feature.properties?.name || feature.properties?.NAME || feature.properties?.ADMIN || "";
                  const value = feature.properties?.value ?? 0;
                  setTooltip({ x: event.point.x, y: event.point.y, text: `${name}: ${value.toLocaleString()}` });
                }
              });
              map.on("mouseleave", "regions-fill", () => setTooltip(null));
            } catch (err) {
              console.error("Failed to load GeoJSON:", err);
            }
          } else if (variant === "points" && points.length > 0) {
            const maxPointValue = Math.max(...points.map((p) => p.value), 1);
            const geojson = {
              type: "FeatureCollection" as const,
              features: points.map((p) => ({
                type: "Feature" as const,
                geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] as [number, number] },
                properties: { label: p.label, value: p.value, radius: 5 + (p.value / maxPointValue) * 15 },
              })),
            };

            map.addSource("points", { type: "geojson", data: geojson });
            map.addLayer({
              id: "points-circle",
              type: "circle",
              source: "points",
              paint: { "circle-radius": ["get", "radius"], "circle-color": colors[3], "circle-opacity": 0.7, "circle-stroke-width": 1, "circle-stroke-color": colors[4] },
            });

            if (points.length > 0) {
              const lngs = points.map((p) => p.lng);
              const lats = points.map((p) => p.lat);
              map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]] as [[number, number], [number, number]], { padding: 50 });
            }

            map.on("mousemove", "points-circle", (e: unknown) => {
              const event = e as { features?: Array<{ properties?: { label?: string; value?: number } }>; point?: { x: number; y: number } };
              const feature = event.features?.[0];
              if (feature && event.point) {
                const label = feature.properties?.label || "";
                const value = feature.properties?.value ?? 0;
                setTooltip({ x: event.point.x, y: event.point.y, text: `${label}: ${value.toLocaleString()}` });
              }
            });
            map.on("mouseleave", "points-circle", () => setTooltip(null));
          }
        });
      } catch (err) {
        console.error("Failed to initialize fullscreen map:", err);
      }
    };

    initMap();

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [variant, geoType, regionValues, points, colors, getColor]);

  return (
    <div style={{ position: "relative", height: "60vh", minHeight: 400 }}>
      <div ref={mapContainerRef} style={{ height: "100%", borderRadius: 8, overflow: "hidden" }} />
      {tooltip && (
        <div
          style={{
            position: "absolute",
            left: tooltip.x + 10,
            top: tooltip.y - 10,
            background: "var(--foreground)",
            color: "var(--background)",
            padding: "6px 10px",
            borderRadius: 4,
            fontSize: 12,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            zIndex: 10,
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          {tooltip.text}
        </div>
      )}
      {/* Legend */}
      {variant === "choropleth" && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 12, fontSize: 12, color: "var(--muted)" }}>
          <span>{minValue.toLocaleString()}</span>
          {colors.map((color, i) => (
            <div key={i} style={{ width: 24, height: 12, background: color, borderRadius: 2 }} />
          ))}
          <span>{maxValue.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

/**
 * MapChart Component - Geographic visualization with choropleth or point variants.
 *
 * Variants:
 * - **choropleth**: Regions colored by value (US states or world countries)
 *   - Uses `regionColumn` for state/country names, `valueColumn` for color intensity
 *   - Supports `geoType`: "us-states" (default) or "world"
 *
 * - **points**: Markers at lat/lng coordinates
 *   - Uses `latColumn`, `lngColumn` for positions
 *   - Optional `labelColumn` for tooltips, `valueColumn` for marker size
 *
 * Features:
 * - Interactive tooltips showing region/point details
 * - Color scale options: green, blue, red, purple
 * - Fullscreen mode with export options
 * - Auto-fitting bounds to data extent
 *
 * @example Choropleth
 * ```json
 * {
 *   "type": "MapChart",
 *   "props": {
 *     "variant": "choropleth",
 *     "queryKey": "sales-by-state",
 *     "regionColumn": "state",
 *     "valueColumn": "total_sales",
 *     "geoType": "us-states"
 *   }
 * }
 * ```
 *
 * @example Point Map
 * ```json
 * {
 *   "type": "MapChart",
 *   "props": {
 *     "variant": "points",
 *     "queryKey": "store-locations",
 *     "latColumn": "lat",
 *     "lngColumn": "lng",
 *     "labelColumn": "store_name"
 *   }
 * }
 * ```
 */
export function MapChart({ element, loading }: ComponentRenderProps) {
  const props = element.props as {
    variant: "choropleth" | "points";
    queryKey: string;
    title?: string | null;
    // Choropleth props
    regionColumn?: string;
    valueColumn?: string;
    geoType?: "us-states" | "world" | null;
    // Point map props
    latColumn?: string;
    lngColumn?: string;
    labelColumn?: string;
    colorScale?: "green" | "blue" | "red" | "purple" | null;
  };

  const {
    variant,
    queryKey,
    title,
    regionColumn,
    valueColumn,
    geoType = "us-states",
    latColumn,
    lngColumn,
    labelColumn,
    colorScale = "blue",
  } = props;

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  const { data } = useData();
  const drillDown = useDrillDownOptional();
  const queryData = getByPath(data, `/queries/${queryKey}`) as
    | Array<Record<string, unknown>>
    | undefined;

  // Generate filename base
  const filenameBase = sanitizeFilename(title || queryKey || "map");

  // Color scales
  const colorScales = {
    green: ["#edf8e9", "#bae4b3", "#74c476", "#31a354", "#006d2c"],
    blue: ["#eff3ff", "#bdd7e7", "#6baed6", "#3182bd", "#08519c"],
    red: ["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"],
    purple: ["#f2f0f7", "#cbc9e2", "#9e9ac8", "#756bb1", "#54278f"],
  };

  const colors = colorScales[colorScale || "blue"];

  // Process data for choropleth
  const { regionValues, maxValue, minValue } = useMemo(() => {
    if (!queryData || variant !== "choropleth") {
      return {
        regionValues: new Map<string, number>(),
        maxValue: 0,
        minValue: 0,
      };
    }

    const map = new Map<string, number>();
    let max = 0;
    let min = Infinity;

    for (const row of queryData) {
      const region = String(row[regionColumn || "region"] ?? "");
      const value = Number(row[valueColumn || "value"] ?? 0);

      if (region) {
        // Normalize region name
        const normalizedRegion = normalizeRegionName(region);
        map.set(normalizedRegion, value);
        // Also store original for matching
        map.set(region, value);
        // Store US state code if applicable
        const stateCode = US_STATE_CODES[normalizedRegion];
        if (stateCode) {
          map.set(stateCode, value);
        }
        max = Math.max(max, value);
        min = Math.min(min, value);
      }
    }

    return {
      regionValues: map,
      maxValue: max || 1,
      minValue: min === Infinity ? 0 : min,
    };
  }, [queryData, regionColumn, valueColumn, variant]);

  // Process data for point map
  const points = useMemo(() => {
    if (!queryData || variant !== "points") {
      return [];
    }

    return queryData
      .map((row) => {
        const lat = Number(row[latColumn || "lat"]);
        const lng = Number(row[lngColumn || "lng"]);
        const label = String(row[labelColumn || "label"] ?? "");
        const value = Number(row[valueColumn || "value"] ?? 1);

        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng, label, value, row };
        }
        return null;
      })
      .filter(Boolean) as Array<{
      lat: number;
      lng: number;
      label: string;
      value: number;
      row: Record<string, unknown>;
    }>;
  }, [queryData, latColumn, lngColumn, labelColumn, valueColumn, variant]);

  // Get color for value
  const getColor = useCallback(
    (value: number) => {
      if (maxValue === minValue) return colors[2];
      const normalizedValue = (value - minValue) / (maxValue - minValue);
      const index = Math.min(
        Math.floor(normalizedValue * (colors.length - 1)),
        colors.length - 1,
      );
      return colors[index];
    },
    [colors, maxValue, minValue],
  );

  // Initialize map
  useEffect(() => {
    if (loading || !mapContainerRef.current) return;

    let mounted = true;

    const initMap = async () => {
      try {
        // Dynamic import to avoid SSR issues
        const maplibregl = await import("maplibre-gl");

        if (!mounted || !mapContainerRef.current) return;

        // Clean up existing map
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }

        // Create map
        const map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: {
            version: 8,
            sources: {
              osm: {
                type: "raster",
                tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                tileSize: 256,
                attribution:
                  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
              },
            },
            layers: [
              {
                id: "osm",
                type: "raster",
                source: "osm",
              },
            ],
          },
          center: geoType === "us-states" ? [-98, 38] : [0, 20],
          zoom: geoType === "us-states" ? 3 : 1,
        });

        mapRef.current = map as unknown as MapLibreMap;

        map.on("load", async () => {
          if (!mounted) return;

          if (variant === "choropleth") {
            // Load GeoJSON for choropleth
            const geoJsonUrl =
              geoType === "us-states"
                ? GEO_DATA_URLS.usStates
                : GEO_DATA_URLS.worldCountries;

            try {
              const response = await fetch(geoJsonUrl);
              if (!response.ok) throw new Error("Failed to load GeoJSON");
              const geoJson = await response.json();

              // Add color to each feature based on data
              if (geoJson.features) {
                for (const feature of geoJson.features) {
                  const name =
                    feature.properties?.name ||
                    feature.properties?.NAME ||
                    feature.properties?.ADMIN ||
                    "";
                  const value =
                    regionValues.get(name) ||
                    regionValues.get(normalizeRegionName(name)) ||
                    0;
                  feature.properties.value = value;
                  feature.properties.color =
                    value > 0 ? getColor(value) : "#f0f0f0";
                }
              }

              map.addSource("regions", {
                type: "geojson",
                data: geoJson,
              });

              map.addLayer({
                id: "regions-fill",
                type: "fill",
                source: "regions",
                paint: {
                  "fill-color": ["get", "color"],
                  "fill-opacity": 0.7,
                },
              });

              map.addLayer({
                id: "regions-outline",
                type: "line",
                source: "regions",
                paint: {
                  "line-color": "#666",
                  "line-width": 0.5,
                },
              });

              // Add hover interaction
              map.on("mousemove", "regions-fill", (e: unknown) => {
                const event = e as {
                  features?: Array<{
                    properties?: {
                      name?: string;
                      NAME?: string;
                      ADMIN?: string;
                      value?: number;
                    };
                  }>;
                  point?: { x: number; y: number };
                };
                const feature = event.features?.[0];
                if (feature && event.point) {
                  const name =
                    feature.properties?.name ||
                    feature.properties?.NAME ||
                    feature.properties?.ADMIN ||
                    "";
                  const value = feature.properties?.value ?? 0;
                  setTooltip({
                    x: event.point.x,
                    y: event.point.y,
                    text: `${name}: ${value.toLocaleString()}`,
                  });
                }
              });

              map.on("mouseleave", "regions-fill", () => {
                setTooltip(null);
              });

              // Add click interaction for drill-down
              if (drillDown) {
                map.on("click", "regions-fill", (e: unknown) => {
                  const event = e as {
                    features?: Array<{
                      properties?: {
                        name?: string;
                        NAME?: string;
                        ADMIN?: string;
                      };
                    }>;
                  };
                  const feature = event.features?.[0];
                  if (feature) {
                    const name =
                      feature.properties?.name ||
                      feature.properties?.NAME ||
                      feature.properties?.ADMIN ||
                      "";
                    if (name && queryData) {
                      const rows = filterRowsByDimension(
                        queryData,
                        regionColumn || "region",
                        name,
                      );
                      drillDown.openDrillDown(
                        {
                          queryKey,
                          dimension: regionColumn || "region",
                          value: name,
                          labelColumn: regionColumn || "region",
                          valueColumn: valueColumn || "value",
                          chartType: "map-choropleth",
                          title: title ?? undefined,
                        },
                        rows,
                      );
                    }
                  }
                });
              }
            } catch (err) {
              console.error("Failed to load GeoJSON:", err);
              setMapError("Failed to load map data");
            }
          } else if (variant === "points" && points.length > 0) {
            // Add points as markers
            const maxPointValue = Math.max(...points.map((p) => p.value), 1);

            const geojson = {
              type: "FeatureCollection" as const,
              features: points.map((p) => ({
                type: "Feature" as const,
                geometry: {
                  type: "Point" as const,
                  coordinates: [p.lng, p.lat] as [number, number],
                },
                properties: {
                  label: p.label,
                  value: p.value,
                  radius: 5 + (p.value / maxPointValue) * 15,
                },
              })),
            };

            map.addSource("points", {
              type: "geojson",
              data: geojson,
            });

            map.addLayer({
              id: "points-circle",
              type: "circle",
              source: "points",
              paint: {
                "circle-radius": ["get", "radius"],
                "circle-color": colors[3],
                "circle-opacity": 0.7,
                "circle-stroke-width": 1,
                "circle-stroke-color": colors[4],
              },
            });

            // Fit bounds to points
            if (points.length > 0) {
              const lngs = points.map((p) => p.lng);
              const lats = points.map((p) => p.lat);
              const bounds = [
                [Math.min(...lngs), Math.min(...lats)],
                [Math.max(...lngs), Math.max(...lats)],
              ];
              map.fitBounds(bounds as [[number, number], [number, number]], {
                padding: 50,
              });
            }

            // Add hover interaction
            map.on("mousemove", "points-circle", (e: unknown) => {
              const event = e as {
                features?: Array<{
                  properties?: { label?: string; value?: number };
                }>;
                point?: { x: number; y: number };
              };
              const feature = event.features?.[0];
              if (feature && event.point) {
                const label = feature.properties?.label || "";
                const value = feature.properties?.value ?? 0;
                setTooltip({
                  x: event.point.x,
                  y: event.point.y,
                  text: `${label}: ${value.toLocaleString()}`,
                });
              }
            });

            map.on("mouseleave", "points-circle", () => {
              setTooltip(null);
            });

            // Add click interaction for drill-down
            if (drillDown) {
              map.on("click", "points-circle", (e: unknown) => {
                const event = e as {
                  features?: Array<{ properties?: { label?: string } }>;
                };
                const feature = event.features?.[0];
                if (feature) {
                  const label = feature.properties?.label || "";
                  if (label && queryData) {
                    const rows = filterRowsByDimension(
                      queryData,
                      labelColumn || "label",
                      label,
                    );
                    drillDown.openDrillDown(
                      {
                        queryKey,
                        dimension: labelColumn || "label",
                        value: label,
                        labelColumn: labelColumn || "label",
                        valueColumn: valueColumn || "value",
                        chartType: "map-points",
                        title: title ?? undefined,
                      },
                      rows,
                    );
                  }
                }
              });
            }
          }
        });
      } catch (err) {
        console.error("Failed to initialize map:", err);
        setMapError("Failed to initialize map");
      }
    };

    initMap();

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [
    loading,
    variant,
    geoType,
    regionValues,
    points,
    colors,
    getColor,
    drillDown,
    queryData,
    queryKey,
    regionColumn,
    valueColumn,
    labelColumn,
    title,
    maxValue,
  ]);

  // Action handlers
  const handleExportPng = useCallback(async () => {
    if (mapContainerRef.current) {
      await exportToPng(mapContainerRef.current, `${filenameBase}.png`);
    }
  }, [filenameBase]);

  const handleExportCsv = useCallback(() => {
    if (queryData) {
      exportToCsv(queryData, `${filenameBase}.csv`);
    }
  }, [queryData, filenameBase]);

  const handleCopy = useCallback(async () => {
    if (mapContainerRef.current) {
      return await copyToClipboard(mapContainerRef.current);
    }
    return false;
  }, []);

  // Loading state
  if (loading) {
    return (
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: title ? 16 : 0,
          }}
        >
          {title && (
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
              {title}
            </h4>
          )}
        </div>
        <div
          style={{
            height: 300,
            background: "var(--border)",
            borderRadius: 8,
            animation: "pulse 1.5s infinite",
          }}
        />
      </div>
    );
  }

  if (!queryData || !Array.isArray(queryData) || queryData.length === 0) {
    return (
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: title ? 16 : 0,
          }}
        >
          {title && (
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
              {title}
            </h4>
          )}
        </div>
        <div
          style={{ padding: 20, color: "var(--muted)", textAlign: "center" }}
        >
          No data available
        </div>
      </div>
    );
  }

  if (mapError) {
    return (
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: title ? 16 : 0,
          }}
        >
          {title && (
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
              {title}
            </h4>
          )}
        </div>
        <div
          style={{
            padding: 20,
            color: "var(--destructive)",
            textAlign: "center",
            background: "rgba(220, 38, 38, 0.1)",
            borderRadius: 8,
          }}
        >
          {mapError}
        </div>
      </div>
    );
  }

  return (
    <>
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          {title ? (
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
              {title}
            </h4>
          ) : (
            <div />
          )}
          <ChartActions
            onExportPng={handleExportPng}
            onExportCsv={handleExportCsv}
            onCopy={handleCopy}
            onFullscreen={() => setIsFullscreen(true)}
          />
        </div>

        <div style={{ position: "relative" }}>
          <div
            ref={mapContainerRef}
            style={{
              height: 400,
              borderRadius: 8,
              overflow: "hidden",
            }}
          />

          {tooltip && (
            <div
              style={{
                position: "absolute",
                left: tooltip.x + 10,
                top: tooltip.y - 10,
                background: "var(--foreground)",
                color: "var(--background)",
                padding: "6px 10px",
                borderRadius: 4,
                fontSize: 12,
                pointerEvents: "none",
                whiteSpace: "nowrap",
                zIndex: 10,
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}
            >
              {tooltip.text}
            </div>
          )}
        </div>

        {/* Legend */}
        {variant === "choropleth" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              marginTop: 8,
              fontSize: 11,
              color: "var(--muted)",
            }}
          >
            <span>{minValue.toLocaleString()}</span>
            {colors.map((color, i) => (
              <div
                key={i}
                style={{
                  width: 20,
                  height: 10,
                  background: color,
                  borderRadius: 2,
                }}
              />
            ))}
            <span>{maxValue.toLocaleString()}</span>
          </div>
        )}
      </div>

      <FullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title={title || "Map"}
        data={queryData}
        columns={
          variant === "choropleth"
            ? [
                { key: regionColumn || "region", label: (regionColumn || "Region").toUpperCase() },
                { key: valueColumn || "value", label: (valueColumn || "Value").toUpperCase() },
              ]
            : [
                { key: latColumn || "lat", label: "LATITUDE" },
                { key: lngColumn || "lng", label: "LONGITUDE" },
                { key: labelColumn || "label", label: "LABEL" },
                { key: valueColumn || "value", label: "VALUE" },
              ]
        }
      >
        <FullscreenMap
          variant={variant}
          geoType={geoType}
          regionValues={regionValues}
          points={points}
          colors={colors}
          getColor={getColor}
          minValue={minValue}
          maxValue={maxValue}
        />
      </FullscreenModal>
    </>
  );
}
