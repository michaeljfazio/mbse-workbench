import { buildDiagramSvg, type BuildDiagramSvgInput } from './svg';

const PNG_PIXEL_RATIO = 2;

export interface BuildDiagramPngOptions {
  readonly pixelRatio?: number;
}

/**
 * Rasterise the same SVG that `buildDiagramSvg` produces into a PNG blob via
 * the browser's Canvas API. 2× pixel-ratio by default so the output stays
 * crisp on retina displays. Runs in any browser context (Playwright e2e or
 * the production app); unit-tested only indirectly via the SVG builder
 * because jsdom lacks Canvas image-rasterisation.
 */
export async function buildDiagramPng(
  input: BuildDiagramSvgInput,
  options: BuildDiagramPngOptions = {},
): Promise<Blob> {
  const svg = buildDiagramSvg(input);
  const ratio = options.pixelRatio ?? PNG_PIXEL_RATIO;
  const dimensions = readSvgDimensions(svg);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(dimensions.width * ratio));
    canvas.height = Math.max(1, Math.round(dimensions.height * ratio));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new PngExportError('canvas 2d context unavailable');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await canvasToPngBlob(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export class PngExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PngExportError';
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new PngExportError('failed to rasterise SVG to image'));
    image.src = src;
  });
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new PngExportError('canvas.toBlob produced no blob'));
      else resolve(blob);
    }, 'image/png');
  });
}

function readSvgDimensions(svg: string): { width: number; height: number } {
  const match = svg.match(/<svg\b[^>]*\bwidth="(\d+)"[^>]*\bheight="(\d+)"/);
  if (!match) return { width: 800, height: 600 };
  return { width: Number(match[1]), height: Number(match[2]) };
}
