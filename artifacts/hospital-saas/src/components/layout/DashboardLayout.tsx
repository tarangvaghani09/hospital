import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const roleLabels: Record<string, string> = {
    SUPER_ADMIN: "Super Admin",
    HOSPITAL_ADMIN: "Hospital Admin",
    DOCTOR: "Doctor",
    RECEPTIONIST: "Receptionist",
    PATIENT: "Patient",
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-md px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
            M
          </div>
          <span className="font-semibold text-xl tracking-tight text-foreground">
            MediCore
          </span>
          {user.hospitalName && (
            <span className="ml-4 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {user.hospitalName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right mr-2 hidden sm:block">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs text-muted-foreground mt-1">{roleLabels[user.role]}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary border border-primary/20">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <button
            onClick={() => logout()}
            className="ml-2 cursor-pointer text-sm font-medium text-destructive transition-colors hover:text-destructive/80"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
