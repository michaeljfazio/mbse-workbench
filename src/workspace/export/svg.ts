import type { EdgeKind, ElementId, ModelEdge, ModelElement } from '@/model';
import type { Viewpoint } from '@/viewpoints';

import type { NodePosition } from '../diagram';

export const EXPORT_SVG_NODE_CLASS = 'mbse-node';
export const EXPORT_SVG_EDGE_CLASS = 'mbse-edge';

const VIEWPORT_PADDING = 40;
const STEREO_FONT_SIZE = 10;
const LABEL_FONT_SIZE = 14;
const STROKE_COLOR = '#1f2937';
const NODE_FILL = '#ffffff';
const NODE_STROKE_WIDTH = 1.5;
const EDGE_STROKE_WIDTH = 1.75;

export interface BuildDiagramSvgInput {
  readonly elements: readonly ModelElement[];
  readonly edges: readonly ModelEdge[];
  readonly positions: Readonly<Record<ElementId, NodePosition>>;
  readonly viewpoint: Viewpoint;
  readonly nodeWidth: number;
  readonly nodeHeight: number;
}

interface PlacedElement {
  readonly element: ModelElement;
  readonly position: NodePosition;
}

interface EdgeGeometry {
  readonly edge: ModelEdge;
  readonly sourceX: number;
  readonly sourceY: number;
  readonly targetX: number;
  readonly targetY: number;
}

export function buildDiagramSvg(input: BuildDiagramSvgInput): string {
  const { elements, edges, positions, viewpoint, nodeWidth, nodeHeight } = input;

  const placed: PlacedElement[] = [];
  for (const element of elements) {
    if (!viewpoint.acceptedElementKinds.includes(element.kind)) continue;
    const position = positions[element.id];
    if (!position) continue;
    placed.push({ element, position });
  }

  const placedIds = new Set(placed.map((p) => p.element.id));
  const edgeGeoms: EdgeGeometry[] = [];
  for (const edge of edges) {
    if (!viewpoint.acceptedEdgeKinds.includes(edge.kind)) continue;
    if (!placedIds.has(edge.sourceId) || !placedIds.has(edge.targetId)) continue;
    const sourcePos = positions[edge.sourceId]!;
    const targetPos = positions[edge.targetId]!;
    edgeGeoms.push({
      edge,
      sourceX: sourcePos.x + nodeWidth / 2,
      sourceY: sourcePos.y + nodeHeight, // bottom handle
      targetX: targetPos.x + nodeWidth / 2,
      targetY: targetPos.y, // top handle
    });
  }

  const viewBox = computeViewBox(placed, nodeWidth, nodeHeight);
  const defs = renderDefs(edgeGeoms);
  const edgeMarkup = edgeGeoms.map(renderEdge).join('\n');
  const nodeMarkup = placed.map((p) => renderNode(p, nodeWidth, nodeHeight)).join('\n');

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' +
    `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" ` +
    `viewBox="${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}" ` +
    `width="${viewBox.width}" height="${viewBox.height}">\n` +
    defs +
    edgeMarkup +
    (edgeMarkup.length > 0 ? '\n' : '') +
    nodeMarkup +
    (nodeMarkup.length > 0 ? '\n' : '') +
    '</svg>\n'
  );
}

function computeViewBox(
  placed: readonly PlacedElement[],
  nodeWidth: number,
  nodeHeight: number,
): { x: number; y: number; width: number; height: number } {
  if (placed.length === 0) {
    return { x: 0, y: 0, width: 400, height: 300 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const { position } of placed) {
    if (position.x < minX) minX = position.x;
    if (position.y < minY) minY = position.y;
    if (position.x + nodeWidth > maxX) maxX = position.x + nodeWidth;
    if (position.y + nodeHeight > maxY) maxY = position.y + nodeHeight;
  }
  return {
    x: Math.floor(minX - VIEWPORT_PADDING),
    y: Math.floor(minY - VIEWPORT_PADDING),
    width: Math.ceil(maxX - minX + VIEWPORT_PADDING * 2),
    height: Math.ceil(maxY - minY + VIEWPORT_PADDING * 2),
  };
}

function renderNode(
  { element, position }: PlacedElement,
  width: number,
  height: number,
): string {
  const label = escapeXml(element.name);
  const stereotype = stereotypeFor(element.kind);
  const tx = position.x + width / 2;
  const stereoY = position.y + 18;
  const labelY = position.y + height / 2 + LABEL_FONT_SIZE / 2;
  return (
    `<g class="${EXPORT_SVG_NODE_CLASS}" data-element-id="${escapeXml(element.id)}">` +
    `<rect x="${position.x}" y="${position.y}" width="${width}" height="${height}" ` +
    `rx="6" ry="6" fill="${NODE_FILL}" stroke="${STROKE_COLOR}" stroke-width="${NODE_STROKE_WIDTH}" />` +
    `<text x="${tx}" y="${stereoY}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="${STEREO_FONT_SIZE}" fill="${STROKE_COLOR}" opacity="0.7">` +
    `«${escapeXml(stereotype)}»</text>` +
    `<text x="${tx}" y="${labelY}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="${LABEL_FONT_SIZE}" font-weight="600" fill="${STROKE_COLOR}">${label}</text>` +
    `</g>`
  );
}

function renderEdge(geom: EdgeGeometry): string {
  const path = orthogonalPath(geom);
  const markerId = markerIdFor(geom.edge);
  // Composition and Aggregation place a diamond marker at the source (whole)
  // end; Generalization and Dependency place an end marker at the target.
  // Association has no end adornment.
  const hasStartMarker =
    geom.edge.kind === 'Composition' || geom.edge.kind === 'Aggregation';
  const hasEndMarker =
    geom.edge.kind === 'Generalization' || geom.edge.kind === 'Dependency';
  const markerStart = hasStartMarker ? ` marker-start="url(#${markerId})"` : '';
  const markerEnd = hasEndMarker ? ` marker-end="url(#${markerId})"` : '';
  const dashAttr =
    geom.edge.kind === 'Dependency' ? ` stroke-dasharray="6 4"` : '';
  return (
    `<g class="${EXPORT_SVG_EDGE_CLASS}" data-edge-id="${escapeXml(geom.edge.id)}" ` +
    `data-edge-kind="${escapeXml(geom.edge.kind)}">` +
    `<path d="${path}" fill="none" stroke="${STROKE_COLOR}" stroke-width="${EDGE_STROKE_WIDTH}"${dashAttr}` +
    `${markerStart}${markerEnd} />` +
    `</g>`
  );
}

function orthogonalPath({ sourceX, sourceY, targetX, targetY }: EdgeGeometry): string {
  const midY = (sourceY + targetY) / 2;
  return [
    `M ${round(sourceX)} ${round(sourceY)}`,
    `L ${round(sourceX)} ${round(midY)}`,
    `L ${round(targetX)} ${round(midY)}`,
    `L ${round(targetX)} ${round(targetY)}`,
  ].join(' ');
}

function renderDefs(geoms: readonly EdgeGeometry[]): string {
  const markers: string[] = [];
  let seenComposition = false;
  let seenAggregation = false;
  let seenGeneralization = false;
  let seenDependency = false;
  for (const geom of geoms) {
    if (geom.edge.kind === 'Composition' && !seenComposition) {
      markers.push(
        `<marker id="mbse-composition" viewBox="0 0 12 10" refX="6" refY="5" ` +
          `markerWidth="12" markerHeight="10" orient="auto-start-reverse" markerUnits="userSpaceOnUse">` +
          `<path d="M0,5 L6,0 L12,5 L6,10 Z" fill="${STROKE_COLOR}" stroke="${STROKE_COLOR}" stroke-width="1" />` +
          `</marker>`,
      );
      seenComposition = true;
    }
    if (geom.edge.kind === 'Aggregation' && !seenAggregation) {
      markers.push(
        `<marker id="mbse-aggregation" viewBox="0 0 12 10" refX="6" refY="5" ` +
          `markerWidth="12" markerHeight="10" orient="auto-start-reverse" markerUnits="userSpaceOnUse">` +
          `<path d="M0,5 L6,0 L12,5 L6,10 Z" fill="${NODE_FILL}" stroke="${STROKE_COLOR}" stroke-width="1.5" />` +
          `</marker>`,
      );
      seenAggregation = true;
    }
    if (geom.edge.kind === 'Generalization' && !seenGeneralization) {
      markers.push(
        `<marker id="mbse-generalization" viewBox="0 0 12 12" refX="11" refY="6" ` +
          `markerWidth="12" markerHeight="12" orient="auto-start-reverse" markerUnits="userSpaceOnUse">` +
          `<path d="M1,1 L11,6 L1,11 Z" fill="${NODE_FILL}" stroke="${STROKE_COLOR}" stroke-width="1.5" />` +
          `</marker>`,
      );
      seenGeneralization = true;
    }
    if (geom.edge.kind === 'Dependency' && !seenDependency) {
      markers.push(
        `<marker id="mbse-dependency" viewBox="0 0 12 12" refX="11" refY="6" ` +
          `markerWidth="12" markerHeight="12" orient="auto-start-reverse" markerUnits="userSpaceOnUse">` +
          `<path d="M1,1 L11,6 L1,11" fill="none" stroke="${STROKE_COLOR}" stroke-width="1.5" />` +
          `</marker>`,
      );
      seenDependency = true;
    }
  }
  if (markers.length === 0) return '';
  return `<defs>${markers.join('')}</defs>\n`;
}

function markerIdFor(edge: ModelEdge): string {
  const kind: EdgeKind = edge.kind;
  if (kind === 'Composition') return 'mbse-composition';
  if (kind === 'Aggregation') return 'mbse-aggregation';
  if (kind === 'Generalization') return 'mbse-generalization';
  if (kind === 'Dependency') return 'mbse-dependency';
  return `mbse-${kind.toLowerCase()}`;
}

function stereotypeFor(kind: ModelElement['kind']): string {
  switch (kind) {
    case 'PartDefinition':
      return 'block';
    default:
      return kind;
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
