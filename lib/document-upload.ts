const KILOBYTE = 1024;
const MEGABYTE = KILOBYTE * KILOBYTE;

export const MAX_DOCUMENT_FILE_SIZE_BYTES = 15 * MEGABYTE;

function formatDocumentFileSize(size: number) {
  if (size < KILOBYTE) {
    return `${size} B`;
  }

  if (size < MEGABYTE) {
    return `${(size / KILOBYTE).toFixed(1)} KB`;
  }

  return `${(size / MEGABYTE).toFixed(1)} MB`;
}

export function getDocumentFileSizeError(file: File) {
  if (file.size <= MAX_DOCUMENT_FILE_SIZE_BYTES) {
    return "";
  }

  return `Selected file is ${formatDocumentFileSize(file.size)}. Upload files up to ${formatDocumentFileSize(MAX_DOCUMENT_FILE_SIZE_BYTES)} to avoid the production upload limit.`;
}

export function validateDocumentFile(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size <= 0) {
    return "";
  }

  return getDocumentFileSizeError(file);
}
