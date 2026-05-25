import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  Building2,
  Users,
  Calendar,
  FileText,
  CreditCard,
  Settings,
  Activity,
  Ticket,
  ClipboardList,
  BarChart3,
  Stethoscope,
  BriefcaseMedical
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

export function Sidebar() {
  const { user } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  let navItems: NavItem[] = [];

  switch (user.role) {
    case "SUPER_ADMIN":
      navItems = [
        { title: "Dashboard", href: "/super-admin/dashboard", icon: LayoutDashboard },
        { title: "Hospitals", href: "/super-admin/hospitals", icon: Building2 },
        { title: "Subscriptions", href: "/super-admin/subscriptions", icon: CreditCard },
        { title: "Reports", href: "/super-admin/reports", icon: BarChart3 },
        { title: "Tickets", href: "/super-admin/tickets", icon: Ticket },
        { title: "Settings", href: "/super-admin/settings", icon: Settings },
      ];
      break;
    case "HOSPITAL_ADMIN":
      navItems = [
        { title: "Dashboard", href: "/hospital/dashboard", icon: LayoutDashboard },
        { title: "Doctors", href: "/hospital/doctors", icon: Stethoscope },
        { title: "Receptionists", href: "/hospital/receptionists", icon: Users },
        { title: "Patients", href: "/hospital/patients", icon: Activity },
        { title: "Departments", href: "/hospital/departments", icon: BriefcaseMedical },
        { title: "Appointments", href: "/hospital/appointments", icon: ClipboardList },
        { title: "Calendar", href: "/hospital/calendar", icon: Calendar },
        { title: "Invoices", href: "/hospital/invoices", icon: FileText },
        { title: "Prescriptions", href: "/hospital/prescriptions", icon: FileText },
        { title: "Reports", href: "/hospital/reports", icon: BarChart3 },
        { title: "Subscription", href: "/hospital/subscription", icon: CreditCard },
        { title: "Profile", href: "/hospital/profile", icon: Building2 },
        { title: "Settings", href: "/hospital/settings", icon: Settings },
      ];
      break;
    case "RECEPTIONIST":
      navItems = [
        { title: "Dashboard", href: "/receptionist/dashboard", icon: LayoutDashboard },
        { title: "Appointments", href: "/receptionist/appointments", icon: ClipboardList },
        { title: "Calendar", href: "/receptionist/calendar", icon: Calendar },
        { title: "Patients", href: "/receptionist/patients", icon: Activity },
        { title: "Invoices", href: "/receptionist/invoices", icon: FileText },
        { title: "Collection", href: "/receptionist/collection", icon: CreditCard },
      ];
      break;
    case "DOCTOR":
      navItems = [
        { title: "Dashboard", href: "/doctor/dashboard", icon: LayoutDashboard },
        { title: "Appointments", href: "/doctor/appointments", icon: ClipboardList },
        { title: "Calendar", href: "/doctor/calendar", icon: Calendar },
        { title: "Patients", href: "/doctor/patients", icon: Activity },
        { title: "Prescriptions", href: "/doctor/prescriptions", icon: FileText },
      ];
      break;
    case "PATIENT":
      navItems = [
        { title: "Dashboard", href: "/patient/dashboard", icon: LayoutDashboard },
        { title: "Appointments", href: "/patient/appointments", icon: Calendar },
        { title: "Prescriptions", href: "/patient/prescriptions", icon: FileText },
        { title: "Invoices", href: "/patient/invoices", icon: CreditCard },
        { title: "Profile", href: "/patient/profile", icon: Settings },
      ];
      break;
  }

  return (
    <aside className="w-64 border-r bg-card hidden md:flex flex-col">
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href || location.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.title}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
