import type { Transcript, TranscriptSegment } from "./types";

function pad(n: number, width = 2) {
  return String(Math.floor(n)).padStart(width, "0");
}

export function toTimestamp(seconds: number, comma = true): string {
  const safe = Math.max(0, seconds);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = Math.floor(safe % 60);
  const ms = Math.round((safe - Math.floor(safe)) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}${comma ? "," : "."}${pad(ms, 3)}`;
}

export function toSrt(segments: TranscriptSegment[]): string {
  return segments
    .map((seg, i) => {
      const speaker = seg.speaker ? `${seg.speaker}: ` : "";
      return `${i + 1}\n${toTimestamp(seg.start)} --> ${toTimestamp(seg.end)}\n${speaker}${seg.text.trim()}`;
    })
    .join("\n\n");
}

export function toVtt(segments: TranscriptSegment[]): string {
  const body = segments
    .map((seg) => {
      const speaker = seg.speaker ? `<v ${seg.speaker}>` : "";
      return `${toTimestamp(seg.start, false)} --> ${toTimestamp(seg.end, false)}\n${speaker}${seg.text.trim()}`;
    })
    .join("\n\n");
  return `WEBVTT\n\n${body}`;
}

export function toMarkdown(transcript: Transcript): string {
  const header = `# ${transcript.title}\n\n${
    transcript.sourceUrl ? `Source: ${transcript.sourceUrl}\n\n` : ""
  }Language: ${transcript.language ?? "unknown"}\n\n---\n\n`;
  return (
    header +
    transcript.segments
      .map((seg) => `**[${toTimestamp(seg.start, false).slice(0, 8)}]** ${seg.speaker ? `*${seg.speaker}:* ` : ""}${seg.text}`)
      .join("\n\n")
  );
}

/**
 * Parse a pasted transcript. Accepts:
 * - [00:12] or [0:12.5] prefixed lines
 * - 00:00:12,000 --> 00:00:18,000 SRT blocks
 * - plain lines (sequential 4s segments are synthesised, clearly marked as approximate)
 */
export function parsePastedTranscript(raw: string): { segments: TranscriptSegment[]; approximate: boolean } {
  const text = raw.replace(/\r\n/g, "\n").trim();
  const segments: TranscriptSegment[] = [];

  const srtBlocks = text.split(/\n{2,}/);
  const srtLike = srtBlocks.some((b) => /^\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}/m.test(b));
  if (srtLike) {
    for (const block of srtBlocks) {
      const lines = block.split("\n").filter(Boolean);
      const timeLine = lines.find((l) => /-->/.test(l));
      if (!timeLine) continue;
      const [startRaw, endRaw] = timeLine.split("-->").map((s) => s.trim());
      const start = parseTimestamp(startRaw);
      const end = parseTimestamp(endRaw);
      const body = lines
        .filter((l) => l !== timeLine && !/^\d+$/.test(l))
        .join(" ")
        .trim();
      if (body && !Number.isNaN(start)) segments.push({ start, end: Number.isNaN(end) ? start + 4 : end, text: body });
    }
    if (segments.length) return { segments, approximate: false };
  }

  const stamped = text.split("\n").filter((l) => /^\s*\[?\d{1,2}:\d{2}/.test(l));
  if (stamped.length > 2) {
    stamped.forEach((line, i) => {
      const match = line.match(/\[?(\d{1,2}):(\d{2})(?::(\d{2}))?(?:[.,](\d{1,3}))?\]?\s*(.*)/);
      if (!match) return;
      const [, a, b, c, , body] = match;
      const start = c ? Number(a) * 3600 + Number(b) * 60 + Number(c) : Number(a) * 60 + Number(b);
      const nextLine = stamped[i + 1];
      const nextMatch = nextLine?.match(/\[?(\d{1,2}):(\d{2})(?::(\d{2}))?/);
      let end = start + 4;
      if (nextMatch) {
        const ns = nextMatch[3]
          ? Number(nextMatch[1]) * 3600 + Number(nextMatch[2]) * 60 + Number(nextMatch[3])
          : Number(nextMatch[1]) * 60 + Number(nextMatch[2]);
        if (ns > start) end = ns;
      }
      if (body?.trim()) segments.push({ start, end, text: body.trim() });
    });
    if (segments.length) return { segments, approximate: false };
  }

  const chunks = text
    .split(/\n{2,}|(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (chunks.length && chunks[0].split(/\s+/).length > 600) {
    // very long single block: split on sentence boundaries
  }
  chunks.forEach((chunk, i) => {
    segments.push({ start: i * 4, end: (i + 1) * 4, text: chunk });
  });
  return { segments, approximate: segments.length > 0 };
}

function parseTimestamp(value: string): number {
  const m = value.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:[.,](\d{1,3}))?$/);
  if (!m) return NaN;
  const [, a, b, c, ms] = m;
  const base = c ? Number(a) * 3600 + Number(b) * 60 + Number(c) : Number(a) * 60 + Number(b);
  return base + (ms ? Number(ms.padEnd(3, "0")) / 1000 : 0);
}

export function totalDuration(segments: TranscriptSegment[]): number {
  return segments.reduce((max, s) => Math.max(max, s.end), 0);
}
