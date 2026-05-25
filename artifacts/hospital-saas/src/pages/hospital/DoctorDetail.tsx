import { useGetDoctor, getGetDoctorQueryKey, useGetDoctorSchedule, getGetDoctorScheduleQueryKey } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams } from "wouter";
import { Mail, Phone, Clock, Stethoscope, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function DoctorDetail() {
  const params = useParams();
  const doctorId = params.id ? parseInt(params.id) : 0;

  const { data: doctor, isLoading: isDoctorLoading } = useGetDoctor(
    doctorId,
    { query: { enabled: !!doctorId, queryKey: getGetDoctorQueryKey(doctorId) } }
  );

  const { data: schedule, isLoading: isScheduleLoading } = useGetDoctorSchedule(
    doctorId,
    { query: { enabled: !!doctorId, queryKey: getGetDoctorScheduleQueryKey(doctorId) } }
  );

  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  if (isDoctorLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-1/4" />
          <div className="grid gap-6 md:grid-cols-3">
            <Skeleton className="h-[200px]" />
            <Skeleton className="h-[200px] md:col-span-2" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!doctor) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold">Doctor not found</h2>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{doctor.name}</h1>
              {doctor.isActive ? (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">Active</Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">{doctor.specialization} • {doctor.departmentName || "General Department"}</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Doctor Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                  {doctor.name.charAt(0)}
                </div>
              </div>
              
              <div className="space-y-3 pt-4 border-t">
                {doctor.phone && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" /> Phone
                    </div>
                    <span className="font-medium">{doctor.phone}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" /> Email
                  </div>
                  <span className="font-medium">{doctor.email}</span>
                </div>
                {doctor.experience && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Briefcase className="w-4 h-4" /> Experience
                    </div>
                    <span className="font-medium">{doctor.experience} Years</span>
                  </div>
                )}
                {doctor.qualification && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Stethoscope className="w-4 h-4" /> Qualification
                    </div>
                    <span className="font-medium">{doctor.qualification}</span>
                  </div>
                )}
                {doctor.consultationFee && (
                  <div className="flex items-center justify-between text-sm pt-2 border-t">
                    <div className="flex items-center gap-2 font-medium">
                      Consultation Fee
                    </div>
                    <span className="font-bold">${doctor.consultationFee}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="md:col-span-2">
            <Tabs defaultValue="schedule" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="schedule">Weekly Schedule</TabsTrigger>
                <TabsTrigger value="appointments">Recent Appointments</TabsTrigger>
              </TabsList>
              
              <TabsContent value="schedule" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Weekly Availability</CardTitle>
                    <CardDescription>Doctor's working hours and slot configuration</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isScheduleLoading ? (
                      <div className="space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {schedule && schedule.length > 0 ? (
                          schedule.map((slot, index) => (
                            <div key={index} className={`flex items-center justify-between p-4 border rounded-lg ${!slot.isAvailable ? 'bg-muted/50 opacity-70' : ''}`}>
                              <div className="font-medium w-24">{daysOfWeek[slot.dayOfWeek]}</div>
                              {slot.isAvailable ? (
                                <>
                                  <div className="flex items-center gap-2 text-sm">
                                    <Clock className="w-4 h-4 text-primary" />
                                    <span>{slot.startTime} - {slot.endTime}</span>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {slot.slotDuration} min slots
                                  </div>
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Available</Badge>
                                </>
                              ) : (
                                <Badge variant="secondary">Unavailable</Badge>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-6 text-muted-foreground">No schedule configured</div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="appointments" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Appointments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-6 text-muted-foreground">
                      Appointment history will be displayed here.
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
