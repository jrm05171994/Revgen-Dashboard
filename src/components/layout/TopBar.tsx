import { auth, signOut } from "@/lib/auth";

interface TopBarProps {
  title: string;
}

export async function TopBar({ title }: TopBarProps) {
  const session = await auth();

  return (
    <header className="h-14 border-b border-gray-100 flex items-center justify-between px-6 bg-white">
      <h1 className="text-base font-semibold text-navy">{title}</h1>

      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">{session?.user?.name}</span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="text-xs text-gray-400 hover:text-gray-600 transition"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
