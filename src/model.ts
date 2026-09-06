export interface DrawingItem {
  el: SVGElement; startLine: number; endLine: number; chapter: number;
  length: number; weight: number; trace: boolean; style: string | null; opacity: number;
}
export interface Chapter { name: string; first: number; }
export interface Artwork {
  frame: HTMLIFrameElement; svg: SVGSVGElement; source: string; lines: string[];
  items: DrawingItem[]; chapters: Chapter[]; view: number[]; warnings: string[]; name: string;
}
export type Mode = 'quick' | 'full';
export interface Segment { start: number; duration: number; first: number; last: number; }
