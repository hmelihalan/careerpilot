"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, FileSearch, LoaderCircle } from "lucide-react";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  PDFPageProxy,
} from "pdfjs-dist";
import type { TextItem } from "pdfjs-dist/types/src/display/api";

import { cn } from "@/lib/utils";
import type { ResumeAnalysis } from "@/src/lib/resume-analysis/schema";
import {
  matchEvidenceAcrossPages,
  type PdfEvidenceMatch,
} from "@/src/lib/resume-builder/pdf-highlights";

const workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

type HighlightRect = {
  improvementIndex: number;
  issue: string;
  priority: "high" | "medium" | "low";
  left: number;
  top: number;
  width: number;
  height: number;
};

type LoadedPage = {
  page: PDFPageProxy;
  highlights: HighlightRect[];
};

const highlightStyles = {
  high: "border-rose-500/80 bg-rose-300/35",
  medium: "border-amber-500/80 bg-amber-300/35",
  low: "border-sky-500/80 bg-sky-300/35",
} as const;

function makeHighlightRects({
  page,
  items,
  matches,
  transform,
}: {
  page: PDFPageProxy;
  items: TextItem[];
  matches: PdfEvidenceMatch[];
  transform: (first: number[], second: number[]) => number[];
}): HighlightRect[] {
  const viewport = page.getViewport({ scale: 1 });

  return matches.flatMap((match) =>
    match.itemIndexes.flatMap((itemIndex) => {
      const item = items[itemIndex];
      if (!item?.str.trim()) return [];
      const matrix = transform(viewport.transform, item.transform);
      const height = Math.max(Math.hypot(matrix[2], matrix[3]), item.height, 7);
      const left = Math.max(0, matrix[4]);
      const top = Math.max(0, matrix[5] - height);
      const width = Math.max(item.width, 5);

      return [
        {
          improvementIndex: match.improvementIndex,
          issue: match.issue,
          priority: match.priority,
          left: (left / viewport.width) * 100,
          top: (top / viewport.height) * 100,
          width: (width / viewport.width) * 100,
          height: (height / viewport.height) * 100,
        },
      ];
    }),
  );
}

function PdfPage({ page, highlights, availableWidth }: LoadedPage & { availableWidth: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseViewport = page.getViewport({ scale: 1 });
  const displayWidth = Math.min(Math.max(availableWidth, 280), 820);
  const displayScale = displayWidth / baseViewport.width;
  const displayHeight = baseViewport.height * displayScale;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || availableWidth < 100) return;
    const outputScale = Math.min(window.devicePixelRatio || 1, 2);
    const viewport = page.getViewport({ scale: displayScale * outputScale });
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    const renderTask = page.render({ canvas, viewport });

    return () => renderTask.cancel();
  }, [availableWidth, displayHeight, displayScale, displayWidth, page]);

  return (
    <div
      className="relative mx-auto overflow-hidden bg-white shadow-sm ring-1 ring-slate-300"
      style={{ width: displayWidth, height: displayHeight }}
    >
      <canvas ref={canvasRef} className="block size-full" aria-label={`Original resume page ${page.pageNumber}`} />
      <div className="absolute inset-0" aria-label={`Suggested changes on page ${page.pageNumber}`}>
        {highlights.map((highlight, index) => (
          <span
            key={`${highlight.improvementIndex}-${index}`}
            className={cn(
              "pointer-events-auto absolute rounded-sm border ring-1 ring-white/70",
              highlightStyles[highlight.priority],
            )}
            style={{
              left: `${highlight.left}%`,
              top: `${highlight.top}%`,
              width: `${highlight.width}%`,
              height: `${highlight.height}%`,
            }}
            title={`Suggestion ${highlight.improvementIndex + 1}: ${highlight.issue}`}
            aria-label={`Suggestion ${highlight.improvementIndex + 1}: ${highlight.issue}`}
          />
        ))}
      </div>
      <span className="absolute bottom-2 right-2 rounded bg-slate-950/75 px-2 py-1 text-[10px] font-medium text-white">
        Page {page.pageNumber}
      </span>
    </div>
  );
}

export function OriginalPdfPreview({
  analysisId,
  improvements,
}: {
  analysisId: string;
  improvements: ResumeAnalysis["improvements"];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(720);
  const [pages, setPages] = useState<LoadedPage[]>([]);
  const [matchedCount, setMatchedCount] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(Math.max(280, entry.contentRect.width - 2));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | null = null;
    let documentProxy: PDFDocumentProxy | null = null;

    async function loadPdf() {
      setStatus("loading");
      try {
        const response = await fetch(
          `/api/resume-analysis/original?analysisId=${encodeURIComponent(analysisId)}`,
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error("PDF unavailable");
        const data = new Uint8Array(await response.arrayBuffer());
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
        loadingTask = pdfjs.getDocument({ data });
        documentProxy = await loadingTask.promise;

        const loaded = await Promise.all(
          Array.from({ length: documentProxy.numPages }, async (_, index) => {
            const page = await documentProxy!.getPage(index + 1);
            const textContent = await page.getTextContent();
            const items = textContent.items.filter(
              (item): item is TextItem => "str" in item,
            );
            return { page, items };
          }),
        );
        const matches = matchEvidenceAcrossPages(
          loaded.map(({ items }) => items),
          improvements,
        );
        const matchedSuggestions = new Set(
          matches.flatMap((pageMatches) =>
            pageMatches.map((match) => match.improvementIndex),
          ),
        );
        const nextPages = loaded.map(({ page, items }, index) => ({
          page,
          highlights: makeHighlightRects({
            page,
            items,
            matches: matches[index],
            transform: pdfjs.Util.transform,
          }),
        }));

        if (!cancelled) {
          setPages(nextPages);
          setMatchedCount(matchedSuggestions.size);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    void loadPdf();
    return () => {
      cancelled = true;
      void loadingTask?.destroy();
    };
  }, [analysisId, improvements]);

  return (
    <div ref={containerRef} className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600">
        <span className="flex items-center gap-1.5 font-medium text-slate-700">
          <FileSearch className="size-3.5 text-indigo-600" aria-hidden="true" />
          Original PDF · evidence highlights
        </span>
        {status === "ready" ? (
          <span>{matchedCount}/{improvements.length} suggestions located</span>
        ) : null}
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-sm border border-rose-500 bg-rose-300/60" /> High
          <span className="size-2.5 rounded-sm border border-amber-500 bg-amber-300/60" /> Medium
          <span className="size-2.5 rounded-sm border border-sky-500 bg-sky-300/60" /> Low
        </span>
      </div>

      {status === "loading" ? (
        <div className="grid min-h-96 place-items-center rounded-lg border border-slate-200 bg-white text-center">
          <div>
            <LoaderCircle className="mx-auto size-5 animate-spin text-indigo-600" aria-hidden="true" />
            <p className="mt-2 text-xs text-slate-500">Rendering the original PDF…</p>
          </div>
        </div>
      ) : null}
      {status === "error" ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-rose-200 bg-rose-50 p-6 text-center">
          <AlertCircle className="size-5 text-rose-600" aria-hidden="true" />
          <p className="mt-2 text-sm font-medium text-rose-800">The original PDF could not be displayed.</p>
          <p className="mt-1 text-xs text-rose-600">The editable Builder preview is still available.</p>
        </div>
      ) : null}
      {status === "ready" ? (
        <div className="space-y-4">
          {pages.map((page) => (
            <PdfPage key={page.page.pageNumber} {...page} availableWidth={containerWidth} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
