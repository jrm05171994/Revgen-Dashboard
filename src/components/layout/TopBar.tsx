import { auth, signOut } from "@/lib/auth";
import { PageExportButton } from "@/components/ui/PageExportButton";

interface TopBarProps {
  title: string;
  action?: React.ReactNode;
  exportId?: string;
}

export async function TopBar({ title, action, exportId }: TopBarProps) {
  const session = await auth();

  return (
    <header className="h-14 border-b border-slate-200 flex items-center justify-between px-6 bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-4">
        <h1 className="text-base font-bold text-navy tracking-tight">{title}</h1>
        {action}
      </div>

      <div className="flex items-center gap-4">
        {exportId && (
          <PageExportButton
            exportId={exportId}
            filename={title.toLowerCase().replace(/\s+/g, "-")}
          />
        )}
        <span className="text-sm text-slate-500">{session?.user?.name}</span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="text-xs text-slate-400 hover:text-slate-700 transition-colors rounded-lg px-2 py-1 hover:bg-slate-100"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
