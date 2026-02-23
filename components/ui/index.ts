export { Alert } from "./alert";
export { Badge } from "./badge";
export { Card } from "./card";
export { Divider } from "./divider";
export { Empty } from "./empty";
export { Grid } from "./grid";
export { Heading } from "./heading";
export { Stack } from "./stack";
export { Text } from "./text";
export { Insight } from "./insight";
export { Metric } from "./metric";
export { Chart } from "./chart";
export { Table } from "./table";
// SQLFilter renders null - actual filters shown via FilterBar (see page.tsx)
export { Filter } from "./filter";
export { FilterBar } from "./filter-bar";
export { Heatmap } from "./heatmap";
export { MapChart } from "./map";
export { Scatter } from "./scatter";
export { Histogram } from "./histogram";
export { Boxplot } from "./boxplot";
export { StackedChart } from "./stacked-chart";
// New chart types
export { DonutChart } from "./donut";
export { MultiLineChart } from "./multi-line";
export { GaugeChart } from "./gauge";
export { FunnelChart } from "./funnel";
export { Treemap } from "./treemap";
// Priority 2 chart types
export { WaterfallChart } from "./waterfall";
export { RadarChart } from "./radar";
export { BulletChart } from "./bullet";

import { Alert } from "./alert";
import { Badge } from "./badge";
import { Card } from "./card";
import { Divider } from "./divider";
import { Empty } from "./empty";
import { Grid } from "./grid";
import { Heading } from "./heading";
import { Stack } from "./stack";
import { Text } from "./text";
import { Insight } from "./insight";
import { Metric } from "./metric";
import { Chart } from "./chart";
import { Table } from "./table";
import { Filter } from "./filter";
import { Heatmap } from "./heatmap";
import { MapChart } from "./map";
import { Scatter } from "./scatter";
import { Histogram } from "./histogram";
import { Boxplot } from "./boxplot";
import { StackedChart } from "./stacked-chart";
import { DonutChart } from "./donut";
import { MultiLineChart } from "./multi-line";
import { GaugeChart } from "./gauge";
import { FunnelChart } from "./funnel";
import { Treemap } from "./treemap";
import { WaterfallChart } from "./waterfall";
import { RadarChart } from "./radar";
import { BulletChart } from "./bullet";

export const componentRegistry = {
  Alert,
  Badge,
  Card,
  Divider,
  Empty,
  Grid,
  Heading,
  Stack,
  Text,
  Insight,
  Metric,
  Chart,
  Table,
  Filter, // No-op component, filters rendered via FilterBar
  Heatmap,
  MapChart,
  Scatter,
  Histogram,
  Boxplot,
  StackedChart,
  DonutChart,
  MultiLineChart,
  GaugeChart,
  FunnelChart,
  Treemap,
  WaterfallChart,
  RadarChart,
  BulletChart,
};
