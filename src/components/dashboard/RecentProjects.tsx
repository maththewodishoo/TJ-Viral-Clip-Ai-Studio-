import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FolderOpen, Play } from "lucide-react";
import { EmptyState, Panel, SectionHeader } from "@/components/ui/primitives";
import { useWorkspace } from "@/lib/store";
import { PLATFORM_LABEL } from "@/lib/platforms";
import { timeAgo } from "@/lib/utils";

function Thumb({ project }: { project: { title: string; thumbnail?: string } }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className="relative h-9 w-14 shrink-0 overflow-hidden rounded-md border border-white/10 bg-[linear-gradient(135deg,#3b1d78,#13265e)]">
      {project.thumbnail && !broken ? (
        <img
          src={project.thumbnail}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="grid h-full w-full place-items-center text-[10px] font-bold text-white/70">
          {project.title.slice(0, 2).toUpperCase()}
        </span>
      )}
      <span className="absolute inset-0 grid place-items-center">
        <span className="grid h-4 w-4 place-items-center rounded-full bg-black/55">
          <Play size={7} fill="white" className="text-white" />
        </span>
      </span>
    </span>
  );
}

export function RecentProjects() {
  const ws = useWorkspace();
  const navigate = useNavigate();
  const projects = [...ws.projects].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3);

  return (
    <Panel className="flex h-full flex-col p-3.5">
      <SectionHeader
        icon={<FolderOpen size={16} />}
        title="Recent Projects"
        right={
          <Link to="/library" className="text-[10.5px] font-medium text-brand-300 hover:text-brand-200">
            View All →
          </Link>
        }
      />
      {projects.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            icon={<FolderOpen size={18} />}
            title="No projects saved yet"
            description="Analyse a video and save it to see it here."
            action={
              <Link to="/analyser" className="text-[11px] font-semibold text-brand-300 hover:text-brand-200">
                Analyse your first video →
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="mt-2 divide-y divide-white/[0.05]">
          {projects.map((project) => (
            <li key={project.id} className="flex items-center gap-2.5 py-2">
              <Thumb project={project} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-white">{project.title}</p>
                <p className="truncate text-[10px] text-[#8e86b1]">
                  {PLATFORM_LABEL[project.platform]} · {timeAgo(project.updatedAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/library?project=${project.id}`)}
                className="shrink-0 rounded-md border border-brand-500/40 bg-brand-500/15 px-2 py-1 text-[10px] font-semibold text-brand-200 hover:bg-brand-500/25"
              >
                Open
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
