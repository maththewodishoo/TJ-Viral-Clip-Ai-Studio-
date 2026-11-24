import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import Overview from "./pages/Overview";
import Analyser from "./pages/Analyser";
import Transcription from "./pages/Transcription";
import ContentIntelligence from "./pages/ContentIntelligence";
import Hooks from "./pages/Hooks";
import ScriptStudio from "./pages/ScriptStudio";
import ImagePrompts from "./pages/ImagePrompts";
import Storyboard from "./pages/Storyboard";
import Voiceover from "./pages/Voiceover";
import Social from "./pages/Social";
import Trends from "./pages/Trends";
import Calendar from "./pages/Calendar";
import Automation from "./pages/Automation";
import SocialCommand from "./pages/SocialCommand";
import Library from "./pages/Library";
import Providers from "./pages/Providers";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Overview />} />
        <Route path="/transcription" element={<Transcription />} />
        <Route path="/analyser" element={<Analyser />} />
        <Route path="/content-intelligence" element={<ContentIntelligence />} />
        <Route path="/hooks" element={<Hooks />} />
        <Route path="/script-studio" element={<ScriptStudio />} />
        <Route path="/image-prompts" element={<ImagePrompts />} />
        <Route path="/storyboard" element={<Storyboard />} />
        <Route path="/voiceover" element={<Voiceover />} />
        <Route path="/social" element={<Social />} />
        <Route path="/trends" element={<Trends />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/automation" element={<Automation />} />
        <Route path="/social-command" element={<SocialCommand />} />
        <Route path="/library" element={<Library />} />
        <Route path="/providers" element={<Providers />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
