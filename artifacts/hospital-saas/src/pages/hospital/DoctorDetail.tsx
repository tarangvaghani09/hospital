import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetDoctor, getGetDoctorQueryKey, useGetDoctorSchedule, getGetDoctorScheduleQueryKey, useUpdateDoctorSchedule } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useParams } from "wouter";
import { Mail, Phone, Stethoscope, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/lib/currency";

type EditableDaySchedule = {
  dayOfWeek: number;
  isAvailable: boolean;
  startTime: string;
  endTime: string;
  slotDuration: string;
};

export function DoctorDetail() {
  const params = useParams();
  const doctorId = params.id ? parseInt(params.id) : 0;
  const currency = useCurrency();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: doctor, isLoading: isDoctorLoading } = useGetDoctor(
    doctorId,
    { query: { enabled: !!doctorId, queryKey: getGetDoctorQueryKey(doctorId) } }
  );

  const { data: schedule, isLoading: isScheduleLoading } = useGetDoctorSchedule(
    doctorId,
    { query: { enabled: !!doctorId, queryKey: getGetDoctorScheduleQueryKey(doctorId) } }
  );
  const updateSchedule = useUpdateDoctorSchedule();

  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const defaultSchedule: EditableDaySchedule[] = daysOfWeek.map((_, dayOfWeek) => ({
    dayOfWeek,
    isAvailable: false,
    startTime: "09:00",
    endTime: "17:00",
    slotDuration: "30",
  }));
  const [editableSchedule, setEditableSchedule] = useState<EditableDaySchedule[]>(defaultSchedule);

  useEffect(() => {
    if (!schedule) {
      setEditableSchedule(defaultSchedule);
      return;
    }
    const byDay = new Map(schedule.map((s) => [s.dayOfWeek, s]));
    setEditableSchedule(
      daysOfWeek.map((_, dayOfWeek) => {
        const existing = byDay.get(dayOfWeek);
        return {
          dayOfWeek,
          isAvailable: existing?.isAvailable ?? false,
          startTime: existing?.startTime ?? "09:00",
          endTime: existing?.endTime ?? "17:00",
          slotDuration: String(existing?.slotDuration ?? 30),
        };
      })
    );
  }, [schedule]);

  function updateDay(dayOfWeek: number, patch: Partial<EditableDaySchedule>) {
    setEditableSchedule((prev) => prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)));
  }

  function validateSchedule() {
    for (const row of editableSchedule) {
      if (!row.isAvailable) continue;
      if (!row.startTime || !row.endTime) {
        return "Start and end time are required for available days";
      }
      if (row.endTime <= row.startTime) {
        return `End time must be after start time for ${daysOfWeek[row.dayOfWeek]}`;
      }
      const duration = Number(row.slotDuration);
      if (!Number.isFinite(duration) || duration < 5 || duration > 240) {
        return `Slot duration must be between 5 and 240 minutes for ${daysOfWeek[row.dayOfWeek]}`;
      }
    }
    return null;
  }

  function handleSaveSchedule() {
    const error = validateSchedule();
    if (error) {
      toast({ variant: "destructive", title: "Invalid schedule", description: error });
      return;
    }

    const payload = editableSchedule.map((d) => ({
      dayOfWeek: d.dayOfWeek,
      isAvailable: d.isAvailable,
      startTime: d.startTime,
      endTime: d.endTime,
      slotDuration: Number(d.slotDuration) || 30,
      breakStart: null,
      breakEnd: null,
      maxPatients: null,
    }));

    updateSchedule.mutate(
      { id: doctorId, data: { schedules: payload } },
      {
        onSuccess: async () => {
          toast({ title: "Schedule updated" });
          await queryClient.invalidateQueries({ queryKey: getGetDoctorScheduleQueryKey(doctorId) });
        },
        onError: (e: any) => {
          toast({ variant: "destructive", title: "Failed to update schedule", description: e?.message ?? "Please try again" });
        },
      }
    );
  }

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
      <div className="space-y-6 overflow-x-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight break-words">{doctor.name}</h1>
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
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" /> Phone
                    </div>
                    <span className="font-medium break-all sm:text-right">{doctor.phone}</span>
                  </div>
                )}
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" /> Email
                  </div>
                  <span className="font-medium break-all sm:text-right">{doctor.email}</span>
                </div>
                {doctor.experience && (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Briefcase className="w-4 h-4" /> Experience
                    </div>
                    <span className="font-medium sm:text-right">{doctor.experience} Years</span>
                  </div>
                )}
                {doctor.qualification && (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Stethoscope className="w-4 h-4" /> Qualification
                    </div>
                    <span className="font-medium break-words sm:text-right">{doctor.qualification}</span>
                  </div>
                )}
                {doctor.consultationFee != null && (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-sm pt-2 border-t">
                    <div className="flex items-center gap-2 font-medium">
                      Consultation Fee
                    </div>
                    <span className="font-bold sm:text-right">{currency.format(doctor.consultationFee)}</span>
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
                        {editableSchedule.map((row) => (
                          <div key={row.dayOfWeek} className={`p-4 border rounded-lg ${!row.isAvailable ? "bg-muted/40" : ""}`}>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="font-medium">{daysOfWeek[row.dayOfWeek]}</div>
                              <div className="flex items-center justify-between gap-3 sm:justify-end">
                                <Badge variant={row.isAvailable ? "outline" : "secondary"} className={row.isAvailable ? "bg-blue-50 text-blue-700 border-blue-200" : ""}>
                                  {row.isAvailable ? "Available" : "Unavailable"}
                                </Badge>
                                <div className="flex items-center gap-2">
                                  <Label className="text-sm text-muted-foreground">Available</Label>
                                  <Switch checked={row.isAvailable} onCheckedChange={(checked) => updateDay(row.dayOfWeek, { isAvailable: checked })} />
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Start Time</Label>
                                <Input type="time" value={row.startTime} disabled={!row.isAvailable} onChange={(e) => updateDay(row.dayOfWeek, { startTime: e.target.value })} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">End Time</Label>
                                <Input type="time" value={row.endTime} disabled={!row.isAvailable} onChange={(e) => updateDay(row.dayOfWeek, { endTime: e.target.value })} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Slot Duration (min)</Label>
                                <Input
                                  type="number"
                                  min={5}
                                  max={240}
                                  step={5}
                                  value={row.slotDuration}
                                  disabled={!row.isAvailable}
                                  onChange={(e) => updateDay(row.dayOfWeek, { slotDuration: e.target.value })}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="flex justify-end pt-2">
                          <Button onClick={handleSaveSchedule} disabled={updateSchedule.isPending}>
                            {updateSchedule.isPending ? "Saving..." : "Save / Update Schedule"}
                          </Button>
                        </div>
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
