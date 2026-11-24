import { useNavigate } from "react-router-dom";
import { Clapperboard, FileText, Image as ImageIcon, Mic, Share2, Video, Zap } from "lucide-react";
import { Panel, SectionHeader } from "@/components/ui/primitives";

const ACTIONS = [
  { label: "Analyse Video", to: "/analyser", icon: Video, tile: "from-[#7c3aed] to-[#a855f7]" },
  { label: "Generate Script", to: "/script-studio", icon: FileText, tile: "from-[#2563eb] to-[#38bdf8]" },
  { label: "Create Images", to: "/image-prompts", icon: ImageIcon, tile: "from-[#059669] to-[#34d399]" },
  { label: "Storyboard", to: "/storyboard", icon: Clapperboard, tile: "from-[#ea580c] to-[#fb923c]" },
  { label: "Voiceover", to: "/voiceover", icon: Mic, tile: "from-[#db2777] to-[#f472b6]" },
  { label: "Social Media", to: "/social", icon: Share2, tile: "from-[#0891b2] to-[#67e8f9]" },
];

export function QuickActions() {
  const navigate = useNavigate();
  return (
    <Panel className="p-4">
      <SectionHeader icon={<Zap size={16} />} title="Quick Actions" />
      <div className="mt-3 grid grid-cols-3 gap-2">
        {ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => navigate(action.to)}
            className="group flex flex-col items-center gap-1.5 rounded-xl border border-[#241a45] bg-[#080414]/60 px-1.5 py-2.5 text-center transition hover:border-brand-500/45 hover:bg-brand-500/[0.08]"
          >
            <span
              className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${action.tile} text-white shadow-md transition group-hover:scale-105`}
            >
              <action.icon size={15} />
            </span>
            <span className="text-[10px] font-medium leading-tight text-[#c2bbdd] group-hover:text-white">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </Panel>
  );
}
