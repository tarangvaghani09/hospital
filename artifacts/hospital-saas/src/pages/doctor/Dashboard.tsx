import { useGetDoctorDashboard, getGetDoctorDashboardQueryKey } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, Clock, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function DoctorDashboard() {
  const { data, isLoading } = useGetDoctorDashboard({
    query: {
      queryKey: getGetDoctorDashboardQueryKey(),
    }
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-6 sm:pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Doctor Dashboard</h1>
          <p className="text-muted-foreground mt-2">Your schedule and patient overview for today</p>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
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
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
                  <Calendar className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.todayAppointments}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Waiting Patients</CardTitle>
                  <Clock className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.waitingPatients || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.completedToday || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.totalPatients}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Today's Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.todaySchedule && data.todaySchedule.length > 0 ? (
                       data.todaySchedule.map((apt) => (
                        <div key={apt.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                          <div>
                            <p className="font-medium">{apt.patientName}</p>
                            <p className="text-sm text-muted-foreground">Token: {apt.tokenNumber} • {apt.appointmentTime}</p>
                          </div>
                          <div className={`px-2 py-1 text-xs rounded-full font-medium border
                            ${apt.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200' : 
                              apt.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              apt.status === 'SCHEDULED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              'bg-muted text-muted-foreground'}`
                          }>
                            {apt.status}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground py-8">No appointments scheduled for today</div>
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
                            <span className="font-medium">{rx.patientName}</span>
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
