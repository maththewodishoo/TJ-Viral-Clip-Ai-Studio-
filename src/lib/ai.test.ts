import { describe, expect, it } from "vitest";
import { normaliseSegments, parseJson } from "./ai";

describe("parseJson", () => {
  it("parses plain JSON", () => {
    expect(parseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips markdown fences", () => {
    expect(parseJson<{ a: number }>('```json\n{"a":2}\n```')).toEqual({ a: 2 });
  });

  it("recovers JSON embedded in prose", () => {
    expect(parseJson<{ hooks: string[] }>('Here you go: {"hooks":["x"]} hope that helps')).toEqual({ hooks: ["x"] });
  });

  it("throws a readable error for invalid output", () => {
    expect(() => parseJson("definitely not json")).toThrow(/not valid JSON/);
  });
});

describe("normaliseSegments", () => {
  it("sorts, trims and drops empty segments", () => {
    const result = normaliseSegments([
      { start: 10, end: 12, text: "  second  " },
      { start: 1, end: 3, text: "" },
      { start: 0, end: 2, text: "first", speaker: "A" },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe("first");
    expect(result[0].speaker).toBe("A");
    expect(result[1].text).toBe("second");
  });

  it("repairs inverted or missing end times", () => {
    const result = normaliseSegments([{ start: 5, end: 2, text: "x" }]);
    expect(result[0].end).toBeGreaterThan(result[0].start);
  });

  it("clamps negative starts to zero", () => {
    const result = normaliseSegments([{ start: -4, end: 2, text: "y" }]);
    expect(result[0].start).toBe(0);
  });
});
