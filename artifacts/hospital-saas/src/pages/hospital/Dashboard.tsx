import { useGetHospitalDashboard, getGetHospitalDashboardQueryKey } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, ClipboardList, DollarSign, CalendarCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { useCurrency } from "@/lib/currency";

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function HospitalDashboard() {
  const { data, isLoading } = useGetHospitalDashboard({
    query: {
      queryKey: getGetHospitalDashboardQueryKey(),
    }
  });
  const currency = useCurrency();

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-6 sm:pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hospital Dashboard</h1>
          <p className="text-muted-foreground mt-2">Overview of today's operations and key metrics</p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
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
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-7">
              <Card className="lg:col-span-4">
                <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
                <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
              </Card>
              <Card className="lg:col-span-3">
                <CardHeader><Skeleton className="h-6 w-52" /></CardHeader>
                <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
              </Card>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Card>
                <CardHeader><Skeleton className="h-6 w-44" /></CardHeader>
                <CardContent className="space-y-3">
                  {[...Array(5)].map((_, i) => <Skeleton key={`dsk-doctor-${i}`} className="h-10 w-full" />)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><Skeleton className="h-6 w-44" /></CardHeader>
                <CardContent className="space-y-3">
                  {[...Array(5)].map((_, i) => <Skeleton key={`dsk-apt-${i}`} className="h-10 w-full" />)}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Doctors</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.totalDoctors}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.totalPatients}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
                  <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.todayAppointments}</div>
                  <p className="text-xs text-muted-foreground mt-1">Out of {data.totalAppointments} total</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{currency.format(data.monthlyRevenue || 0)}</div>
                  {data.pendingInvoices ? (
                    <p className="text-xs text-muted-foreground mt-1">{data.pendingInvoices} pending invoices</p>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-7">
              <Card className="lg:col-span-4">
                <CardHeader>
                  <CardTitle>Revenue Overview</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {data.revenueByMonth && data.revenueByMonth.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.revenueByMonth}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => currency.format(value)} />
                        <Tooltip cursor={{fill: 'hsl(var(--muted))'}} contentStyle={{backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))'}} />
                        <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">No data available</div>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle>Appointments by Status</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {data.appointmentsByStatus && data.appointmentsByStatus.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.appointmentsByStatus}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="count"
                          nameKey="status"
                        >
                          {data.appointmentsByStatus.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))'}} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">No data available</div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
               <Card>
                <CardHeader>
                  <CardTitle>Top Performing Doctors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.topDoctors?.map((doctor, index) => (
                      <div key={index} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                            {doctor.doctorName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{doctor.doctorName}</p>
                            <p className="text-xs text-muted-foreground">{doctor.appointments} appointments</p>
                          </div>
                        </div>
                        <div className="text-sm font-semibold">{currency.format(doctor.revenue)}</div>
                      </div>
                    ))}
                    {!data.topDoctors?.length && (
                      <div className="text-center text-muted-foreground py-4 text-sm">No data available</div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Recent Appointments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.recentAppointments?.slice(0, 5).map((apt) => (
                      <div key={apt.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                        <div>
                          <p className="font-medium text-sm">{apt.patientName}</p>
                          <p className="text-xs text-muted-foreground">Dr. {apt.doctorName} • {apt.appointmentTime}</p>
                        </div>
                        <div className={`px-2 py-0.5 text-xs rounded-full font-medium border
                          ${apt.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50' : 
                            apt.status === 'SCHEDULED' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50' :
                            'bg-muted text-muted-foreground'}`
                        }>
                          {apt.status}
                        </div>
                      </div>
                    ))}
                    {!data.recentAppointments?.length && (
                      <div className="text-center text-muted-foreground py-4 text-sm">No recent appointments</div>
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
