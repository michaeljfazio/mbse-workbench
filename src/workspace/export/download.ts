import { buildDiagramPng } from './png';
import { buildDiagramSvg, type BuildDiagramSvgInput } from './svg';
import { slugifyDiagramName } from './slug';

export interface DownloadDiagramOptions {
  readonly diagramName: string;
  readonly svgInput: BuildDiagramSvgInput;
}

export async function downloadDiagramSvg({
  diagramName,
  svgInput,
}: DownloadDiagramOptions): Promise<void> {
  const svg = buildDiagramSvg(svgInput);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  triggerDownload(blob, `${slugifyDiagramName(diagramName)}.svg`);
}

export async function downloadDiagramPng({
  diagramName,
  svgInput,
}: DownloadDiagramOptions): Promise<void> {
  const blob = await buildDiagramPng(svgInput);
  triggerDownload(blob, `${slugifyDiagramName(diagramName)}.png`);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Revoke after the click has been processed by the browser.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
