import type { VideoMeta } from "./types";

/** In-memory handoff so an uploaded file / URL can cross routes without storage costs. */
let pendingFile: File | null = null;
let pendingMeta: VideoMeta | null = null;

export function setPendingFile(file: File | null) {
  pendingFile = file;
}

export function takePendingFile(): File | null {
  const file = pendingFile;
  pendingFile = null;
  return file;
}

export function setPendingMeta(meta: VideoMeta | null) {
  pendingMeta = meta;
}

export function takePendingMeta(): VideoMeta | null {
  const meta = pendingMeta;
  pendingMeta = null;
  return meta;
}
