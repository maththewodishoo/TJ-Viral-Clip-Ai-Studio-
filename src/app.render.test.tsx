// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { ToastProvider } from "./components/ui/toast";

beforeAll(() => {
  Object.defineProperty(window, "scrollTo", { value: () => undefined, writable: true });
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

const ROUTES: Array<[string, string]> = [
  ["/", "Welcome to"],
  ["/transcription", "Transcription Studio"],
  ["/analyser", "Viral Video Analyser"],
  ["/content-intelligence", "Content Intelligence"],
  ["/hooks", "Hook Generator"],
  ["/script-studio", "Script Studio"],
  ["/image-prompts", "Image Prompt Studio"],
  ["/storyboard", "Video Storyboard"],
  ["/voiceover", "Voiceover Studio"],
  ["/social", "Social Media Content"],
  ["/trends", "Trend Research"],
  ["/calendar", "Content Calendar"],
  ["/automation", "Automation Workflows"],
  ["/social-command", "Social Media Command"],
  ["/library", "Project Library"],
  ["/providers", "AI Providers"],
  ["/settings", "Settings & Diagnostics"],
];

describe("every studio section renders", () => {
  for (const [route, heading] of ROUTES) {
    it(`renders ${route}`, () => {
      render(
        <MemoryRouter initialEntries={[route]}>
          <ToastProvider>
            <App />
          </ToastProvider>
        </MemoryRouter>,
      );
      expect(screen.getAllByText(new RegExp(heading, "i")).length).toBeGreaterThan(0);
      expect(document.querySelectorAll("nav[aria-label='Main'] a").length).toBe(17);
    });
  }
});

describe("dashboard content", () => {
  it("shows the video URL analyser immediately and empty-state stats", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <ToastProvider>
          <App />
        </ToastProvider>
      </MemoryRouter>,
    );
    expect(screen.getByLabelText("Video URL")).toBeTruthy();
    expect(screen.getByText(/Analyse any viral video/i)).toBeTruthy();
    expect(screen.getByText("Videos Analysed")).toBeTruthy();
    expect(screen.getByText(/No projects saved yet/i)).toBeTruthy();
    expect(screen.getByText(/Illustrative sample data/i)).toBeTruthy();
    expect(screen.getAllByText(/Not connected/i).length).toBeGreaterThan(0);
  });

  it("does not show fabricated activity percentages without records", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <ToastProvider>
          <App />
        </ToastProvider>
      </MemoryRouter>,
    );
    expect(screen.queryByText(/^\+20%$/)).toBeNull();
    expect(screen.getByText(/No activity in this range yet/i)).toBeTruthy();
  });
});

describe("unknown routes", () => {
  it("redirects to the dashboard", () => {
    render(
      <MemoryRouter initialEntries={["/does-not-exist"]}>
        <ToastProvider>
          <App />
        </ToastProvider>
      </MemoryRouter>,
    );
    expect(screen.getByLabelText("Video URL")).toBeTruthy();
  });
});
