import { useLocation } from "wouter";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-md px-3 py-2.5 sm:px-4 md:px-6 md:py-3 flex items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
            M
          </div>
          <span className="font-semibold text-lg sm:text-xl tracking-tight text-foreground">
            MediCore
          </span>
          {user.hospitalName && (
            <span className="ml-2 hidden sm:inline-flex px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {user.hospitalName}
            </span>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 md:flex-row md:items-center md:gap-4">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="md:hidden h-10 w-10 cursor-pointer"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hidden md:flex min-w-[170px] sm:min-w-[220px] items-center justify-between rounded-xl border border-border bg-transparent px-3 py-2 sm:px-4 text-right outline-none transition-colors hover:border-border/80 hover:bg-muted/40 cursor-pointer">
                <div className="text-center w-full">
                  <p className="text-sm font-medium leading-none truncate">{user.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{roleLabels[user.role]}</p>
                </div>
                <ChevronDown className="ml-3 h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-0 rounded-xl border border-border bg-popover p-1"
            >
              <DropdownMenuItem className="w-full cursor-pointer rounded-lg text-destructive focus:text-destructive" onClick={() => logout()}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        <Sidebar mobileOpen={mobileNavOpen} onMobileOpenChange={setMobileNavOpen} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-8 xl:p-10">
          <div className="w-full lg:max-w-7xl lg:mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
