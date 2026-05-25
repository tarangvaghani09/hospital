import { useGetPatientDashboard, getGetPatientDashboardQueryKey } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, FileText, CreditCard, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export function PatientDashboard() {
  const { data, isLoading } = useGetPatientDashboard({
    query: {
      queryKey: getGetPatientDashboardQueryKey(),
    }
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Patient Portal</h1>
          <p className="text-muted-foreground mt-2">Welcome to your personal health dashboard</p>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-1/3 mb-1" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : data ? (
          <>
            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Upcoming Appointments</CardTitle>
                  <Calendar className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.upcomingAppointments}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.totalVisits}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Pending Bills</CardTitle>
                  <CreditCard className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.pendingBills || 0}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Appointments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.recentAppointments && data.recentAppointments.length > 0 ? (
                      data.recentAppointments.map((apt) => (
                        <div key={apt.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                          <div>
                            <p className="font-medium">Dr. {apt.doctorName}</p>
                            <p className="text-sm text-muted-foreground">{new Date(apt.appointmentDate).toLocaleDateString()} • {apt.appointmentTime}</p>
                          </div>
                          <Badge className={
                            apt.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
                            apt.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' : 'bg-muted'
                          }>
                            {apt.status}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground py-8">No recent appointments</div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Recent Prescriptions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.recentPrescriptions && data.recentPrescriptions.length > 0 ? (
                      data.recentPrescriptions.map((rx) => (
                        <div key={rx.id} className="flex flex-col border-b pb-3 last:border-0 last:pb-0">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium">Dr. {rx.doctorName}</span>
                            <span className="text-xs text-muted-foreground">{new Date(rx.createdAt).toLocaleDateString()}</span>
                          </div>
                          {rx.diagnosis && <span className="text-sm text-muted-foreground truncate">{rx.diagnosis}</span>}
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground py-8">No recent prescriptions</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
