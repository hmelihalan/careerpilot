export const RESUME_OCR_CHARACTER_THRESHOLD = 40;

export async function createResumePdfLoadingTask(data: Uint8Array) {
  const { getDocument } = await import(
    "pdfjs-dist/legacy/build/pdf.mjs"
  );

  return getDocument({
    data,
    useWorkerFetch: false,
  });
}
