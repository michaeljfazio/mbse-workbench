import { stripStandardLibrary } from '@/library';
import type { Project } from '@/repository/types';
import { serializeProject } from '@/serializer';
import { serializeProjectJson } from '@/workspace/jsonProject';
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

export interface DownloadProjectSysmlOptions {
  readonly project: Project;
}

export function downloadProjectSysml({
  project,
}: DownloadProjectSysmlOptions): void {
  // Mirror the JSON/sessionStorage boundary: emit user content only.
  // Library subtrees are canonical and re-merged on load/parse.
  const text = serializeProject(stripStandardLibrary(project));
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  triggerDownload(blob, `${slugifyDiagramName(project.name)}.sysml`);
}

export function downloadProjectJson({
  project,
}: DownloadProjectSysmlOptions): void {
  const text = serializeProjectJson(project);
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  triggerDownload(blob, `${slugifyDiagramName(project.name)}.json`);
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
