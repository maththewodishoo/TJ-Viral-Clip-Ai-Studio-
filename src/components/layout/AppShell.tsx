import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { NAV_ITEMS, MOBILE_NAV } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Sidebar, SidebarNav } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="min-h-screen">
      <Sidebar />
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-[268px] flex-col border-r border-[#241a44] bg-[#080414] animate-fade-up">
            <SidebarNav onNavigate={() => setOpen(false)} onClose={() => setOpen(false)} />
          </aside>
        </div>
      )}
      <div className="lg:pl-[232px]">
        <Topbar onMenu={() => setOpen(true)} />
        <main className="mx-auto w-full max-w-[1560px] px-3 pb-24 pt-3 sm:px-5 sm:pb-10 sm:pt-4">
          <Outlet />
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#241a44] bg-[#070312]/95 pb-safe backdrop-blur-xl lg:hidden"
        aria-label="Primary mobile"
      >
        <div className="grid grid-cols-5">
          {MOBILE_NAV.map((path) => {
            const item = NAV_ITEMS.find((i) => i.to === path)!;
            return (
              <NavLink
                key={path}
                to={path}
                end={path === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center gap-1 py-2 text-[10px] font-medium transition",
                    isActive ? "text-brand-300" : "text-[#8b83ad]",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={18} className={isActive ? "drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" : ""} />
                    <span>{item.short ?? item.label.split(" ")[0]}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  icon,
  actions,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {icon && (
          <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-brand-500/25 bg-brand-500/10 text-brand-300">
            {icon}
          </span>
        )}
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-white sm:text-xl">{title}</h1>
          <p className="mt-0.5 max-w-2xl text-[12.5px] leading-relaxed text-[#8e86b1]">{description}</p>
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
