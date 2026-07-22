import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  RESUME_DATASET_REPORT_FILENAME,
  runResumeDatasetExtraction,
} from "../src/server/resumes/resume-dataset-batch";

type CliOptions = {
  inputDirectory: string;
  outputDirectory: string;
};

function readOptionValue(args: string[], index: number, name: string): string {
  const value = args[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a directory path.`);
  }

  return value;
}

export function parseResumeDatasetCliOptions(
  args: string[],
  workingDirectory = process.cwd(),
): CliOptions {
  let inputDirectory = path.join(workingDirectory, "ml", "data", "raw", "pdfs");
  let outputDirectory = path.join(workingDirectory, "ml", "data", "processed");

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === "--input") {
      inputDirectory = path.resolve(
        workingDirectory,
        readOptionValue(args, index, "--input"),
      );
      index += 1;
    } else if (argument?.startsWith("--input=")) {
      inputDirectory = path.resolve(
        workingDirectory,
        argument.slice("--input=".length),
      );
    } else if (argument === "--output") {
      outputDirectory = path.resolve(
        workingDirectory,
        readOptionValue(args, index, "--output"),
      );
      index += 1;
    } else if (argument?.startsWith("--output=")) {
      outputDirectory = path.resolve(
        workingDirectory,
        argument.slice("--output=".length),
      );
    } else {
      throw new Error(`Unknown argument: ${argument ?? ""}`);
    }
  }

  return { inputDirectory, outputDirectory };
}

export async function main(args = process.argv.slice(2)): Promise<void> {
  const options = parseResumeDatasetCliOptions(args);
  const report = await runResumeDatasetExtraction({
    rawDirectory: options.inputDirectory,
    outputDirectory: options.outputDirectory,
    onProgress: (message) => console.log(message),
  });

  console.log(
    [
      "Resume dataset extraction complete",
      `Files: ${report.totalFiles}`,
      `Successful: ${report.successfulFiles}`,
      `OCR required: ${report.ocrRequiredFiles}`,
      `Failed: ${report.failedFiles}`,
      `Duplicates: ${report.duplicateContentFiles}`,
      `Pages: ${report.totalPages}`,
      `Lines: ${report.totalLines}`,
      `Characters: ${report.totalCharacters}`,
      `Report: ${path.join(options.outputDirectory, RESUME_DATASET_REPORT_FILENAME)}`,
    ].join("\n"),
  );
}

const entryPoint = process.argv[1];

if (entryPoint && import.meta.url === pathToFileURL(entryPoint).href) {
  main().catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Dataset extraction failed.";
    console.error(`Resume dataset extraction failed: ${message}`);
    process.exitCode = 1;
  });
}
