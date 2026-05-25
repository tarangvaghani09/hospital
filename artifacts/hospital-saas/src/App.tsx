import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Public Pages
import { Login } from "@/pages/public/Login";
import { StaffLogin } from "@/pages/public/StaffLogin";
import { RegisterHospital } from "@/pages/public/RegisterHospital";
import { RegisterPatient } from "@/pages/public/RegisterPatient";

// Super Admin Pages
import { SuperAdminDashboard } from "@/pages/super-admin/Dashboard";
import { SuperAdminHospitals } from "@/pages/super-admin/Hospitals";
import { SuperAdminHospitalDetail } from "@/pages/super-admin/HospitalDetail";
import { SuperAdminSubscriptions } from "@/pages/super-admin/Subscriptions";
import { SuperAdminReports } from "@/pages/super-admin/Reports";
import { SuperAdminTickets } from "@/pages/super-admin/Tickets";
import { SuperAdminSettings } from "@/pages/super-admin/Settings";

// Hospital Admin Pages
import { HospitalDashboard } from "@/pages/hospital/Dashboard";
import { Doctors } from "@/pages/hospital/Doctors";
import { DoctorDetail } from "@/pages/hospital/DoctorDetail";
import { Departments } from "@/pages/hospital/Departments";
import { Patients } from "@/pages/hospital/Patients";
import { PatientDetail } from "@/pages/hospital/PatientDetail";
import { Receptionists } from "@/pages/hospital/Receptionists";
import { Appointments } from "@/pages/hospital/Appointments";
import { Invoices } from "@/pages/hospital/Invoices";
import { Prescriptions } from "@/pages/hospital/Prescriptions";
import { HospitalReports } from "@/pages/hospital/Reports";
import { HospitalSubscription } from "@/pages/hospital/Subscription";
import { HospitalProfile } from "@/pages/hospital/Profile";
import { HospitalSettings } from "@/pages/hospital/Settings";
import { SharedCalendar } from "@/components/calendar/SharedCalendar";

// Receptionist Pages
import { ReceptionistDashboard } from "@/pages/receptionist/Dashboard";

// Doctor Pages
import { DoctorDashboard } from "@/pages/doctor/Dashboard";

// Patient Pages
import { PatientDashboard } from "@/pages/patient/Dashboard";
import { PatientProfile } from "@/pages/patient/Profile";

const queryClient = new QueryClient();

function RootRoute() {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  if (isAuthenticated && user) {
    switch (user.role) {
      case "SUPER_ADMIN": return <Redirect to="/super-admin/dashboard" />;
      case "HOSPITAL_ADMIN": return <Redirect to="/hospital/dashboard" />;
      case "DOCTOR": return <Redirect to="/doctor/dashboard" />;
      case "RECEPTIONIST": return <Redirect to="/receptionist/dashboard" />;
      case "PATIENT": return <Redirect to="/patient/dashboard" />;
      default: return <Redirect to="/login" />;
    }
  }

  return <Redirect to="/login" />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RootRoute} />
      <Route path="/login" component={Login} />
      <Route path="/staff" component={StaffLogin} />
      <Route path="/register" component={RegisterHospital} />
      <Route path="/register-patient" component={RegisterPatient} />
      
      {/* Super Admin */}
      <Route path="/super-admin/dashboard">
        {() => <ProtectedRoute component={SuperAdminDashboard} allowedRoles={["SUPER_ADMIN"]} />}
      </Route>
      <Route path="/super-admin/hospitals">
        {() => <ProtectedRoute component={SuperAdminHospitals} allowedRoles={["SUPER_ADMIN"]} />}
      </Route>
      <Route path="/super-admin/hospitals/:id">
        {() => <ProtectedRoute component={SuperAdminHospitalDetail} allowedRoles={["SUPER_ADMIN"]} />}
      </Route>
      <Route path="/super-admin/subscriptions">
        {() => <ProtectedRoute component={SuperAdminSubscriptions} allowedRoles={["SUPER_ADMIN"]} />}
      </Route>
      <Route path="/super-admin/reports">
        {() => <ProtectedRoute component={SuperAdminReports} allowedRoles={["SUPER_ADMIN"]} />}
      </Route>
      <Route path="/super-admin/tickets">
        {() => <ProtectedRoute component={SuperAdminTickets} allowedRoles={["SUPER_ADMIN"]} />}
      </Route>
      <Route path="/super-admin/settings">
        {() => <ProtectedRoute component={SuperAdminSettings} allowedRoles={["SUPER_ADMIN"]} />}
      </Route>

      {/* Hospital Admin */}
      <Route path="/hospital/dashboard">
        {() => <ProtectedRoute component={HospitalDashboard} allowedRoles={["HOSPITAL_ADMIN"]} />}
      </Route>
      <Route path="/hospital/doctors">
        {() => <ProtectedRoute component={Doctors} allowedRoles={["HOSPITAL_ADMIN"]} />}
      </Route>
      <Route path="/hospital/doctors/:id">
        {() => <ProtectedRoute component={DoctorDetail} allowedRoles={["HOSPITAL_ADMIN"]} />}
      </Route>
      <Route path="/hospital/receptionists">
        {() => <ProtectedRoute component={Receptionists} allowedRoles={["HOSPITAL_ADMIN"]} />}
      </Route>
      <Route path="/hospital/departments">
        {() => <ProtectedRoute component={Departments} allowedRoles={["HOSPITAL_ADMIN"]} />}
      </Route>
      <Route path="/hospital/patients">
        {() => <ProtectedRoute component={Patients} allowedRoles={["HOSPITAL_ADMIN"]} />}
      </Route>
      <Route path="/hospital/patients/:id">
        {() => <ProtectedRoute component={PatientDetail} allowedRoles={["HOSPITAL_ADMIN"]} />}
      </Route>
      <Route path="/hospital/appointments">
        {() => <ProtectedRoute component={Appointments} allowedRoles={["HOSPITAL_ADMIN"]} />}
      </Route>
      <Route path="/hospital/calendar">
        {() => <ProtectedRoute component={SharedCalendar} allowedRoles={["HOSPITAL_ADMIN"]} />}
      </Route>
      <Route path="/hospital/invoices">
        {() => <ProtectedRoute component={Invoices} allowedRoles={["HOSPITAL_ADMIN"]} />}
      </Route>
      <Route path="/hospital/prescriptions">
        {() => <ProtectedRoute component={Prescriptions} allowedRoles={["HOSPITAL_ADMIN"]} />}
      </Route>
      <Route path="/hospital/reports">
        {() => <ProtectedRoute component={HospitalReports} allowedRoles={["HOSPITAL_ADMIN"]} />}
      </Route>
      <Route path="/hospital/subscription">
        {() => <ProtectedRoute component={HospitalSubscription} allowedRoles={["HOSPITAL_ADMIN"]} />}
      </Route>
      <Route path="/hospital/profile">
        {() => <ProtectedRoute component={HospitalProfile} allowedRoles={["HOSPITAL_ADMIN"]} />}
      </Route>
      <Route path="/hospital/settings">
        {() => <ProtectedRoute component={HospitalSettings} allowedRoles={["HOSPITAL_ADMIN"]} />}
      </Route>

      {/* Receptionist */}
      <Route path="/receptionist/dashboard">
        {() => <ProtectedRoute component={ReceptionistDashboard} allowedRoles={["RECEPTIONIST"]} />}
      </Route>
      <Route path="/receptionist/appointments">
        {() => <ProtectedRoute component={Appointments} allowedRoles={["RECEPTIONIST"]} />}
      </Route>
      <Route path="/receptionist/calendar">
        {() => <ProtectedRoute component={SharedCalendar} allowedRoles={["RECEPTIONIST"]} />}
      </Route>
      <Route path="/receptionist/patients">
        {() => <ProtectedRoute component={Patients} allowedRoles={["RECEPTIONIST"]} />}
      </Route>
      <Route path="/receptionist/invoices">
        {() => <ProtectedRoute component={Invoices} allowedRoles={["RECEPTIONIST"]} />}
      </Route>
      <Route path="/receptionist/collection">
        {() => <ProtectedRoute component={HospitalReports} allowedRoles={["RECEPTIONIST"]} />}
      </Route>

      {/* Doctor */}
      <Route path="/doctor/dashboard">
        {() => <ProtectedRoute component={DoctorDashboard} allowedRoles={["DOCTOR"]} />}
      </Route>
      <Route path="/doctor/appointments">
        {() => <ProtectedRoute component={Appointments} allowedRoles={["DOCTOR"]} />}
      </Route>
      <Route path="/doctor/calendar">
        {() => <ProtectedRoute component={SharedCalendar} allowedRoles={["DOCTOR"]} />}
      </Route>
      <Route path="/doctor/patients">
        {() => <ProtectedRoute component={Patients} allowedRoles={["DOCTOR"]} />}
      </Route>
      <Route path="/doctor/prescriptions">
        {() => <ProtectedRoute component={Prescriptions} allowedRoles={["DOCTOR"]} />}
      </Route>

      {/* Patient */}
      <Route path="/patient/dashboard">
        {() => <ProtectedRoute component={PatientDashboard} allowedRoles={["PATIENT"]} />}
      </Route>
      <Route path="/patient/appointments">
        {() => <ProtectedRoute component={Appointments} allowedRoles={["PATIENT"]} />}
      </Route>
      <Route path="/patient/prescriptions">
        {() => <ProtectedRoute component={Prescriptions} allowedRoles={["PATIENT"]} />}
      </Route>
      <Route path="/patient/invoices">
        {() => <ProtectedRoute component={Invoices} allowedRoles={["PATIENT"]} />}
      </Route>
      <Route path="/patient/profile">
        {() => <ProtectedRoute component={PatientProfile} allowedRoles={["PATIENT"]} />}
      </Route>

      <Route>
        <div className="min-h-screen flex items-center justify-center">
          <h1 className="text-2xl font-bold">404 Not Found</h1>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
