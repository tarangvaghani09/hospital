import { useState } from "react";
import { useGetCalendarAppointments, getGetCalendarAppointmentsQueryKey } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, startOfWeek, endOfWeek, addDays, isSameDay } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, Stethoscope } from "lucide-react";

const statusColors: Record<string, string> = {
  COMPLETED: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400",
  SCHEDULED: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
  CONFIRMED: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400",
  IN_PROGRESS: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
  CANCELLED: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400",
  NO_SHOW: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300",
};

function AppointmentDetailModal({ apt, onClose }: { apt: any; onClose: () => void }) {
  if (!apt) return null;
  return (
    <Dialog open={!!apt} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-primary" />
            Appointment Details
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Patient</p>
              <p className="font-semibold">{apt.patientName}</p>
              {apt.patientPhone && <p className="text-sm text-muted-foreground">{apt.patientPhone}</p>}
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Doctor</p>
              <p className="font-semibold">{apt.doctorName ? `Dr. ${apt.doctorName}` : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Date</p>
              <p className="font-medium text-sm">{apt.start ? new Date(apt.start).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" }) : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Time</p>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="font-medium text-sm">{apt.start ? format(new Date(apt.start), "HH:mm") : "—"} – {apt.end ? format(new Date(apt.end), "HH:mm") : ""}</p>
              </div>
            </div>
          </div>
          {apt.status && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Status</p>
              <Badge className={`${statusColors[apt.status] ?? "bg-gray-100 text-gray-800 border-gray-200"} border`}>
                {apt.status?.replace(/_/g, " ")}
              </Badge>
            </div>
          )}
          {apt.tokenNumber && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Token</p>
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary font-bold text-sm">
                {apt.tokenNumber}
              </div>
            </div>
          )}
          {apt.appointmentType && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Type</p>
              <p className="text-sm capitalize">{apt.appointmentType?.replace(/_/g, " ")}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SharedCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedApt, setSelectedApt] = useState<any>(null);

  const startDate = format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const endDate = format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const { data: appointments, isLoading } = useGetCalendarAppointments(
    { startDate, endDate },
    { query: { queryKey: getGetCalendarAppointmentsQueryKey({ startDate, endDate }) } }
  );

  const nextWeek = () => setCurrentDate(addDays(currentDate, 7));
  const prevWeek = () => setCurrentDate(addDays(currentDate, -7));
  const today = () => setCurrentDate(new Date());

  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), i));
  const timeSlots = Array.from({ length: 13 }).map((_, i) => `${String(i + 8).padStart(2, "0")}:00`);

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-6 sm:pb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
            <p className="text-muted-foreground mt-2">Weekly view of all appointments · Click any appointment to view details</p>
          </div>
          <div className="flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Button variant="outline" onClick={today} size="sm" className="w-full sm:w-auto">Today</Button>
            <div className="flex w-full sm:w-auto items-center gap-1 bg-muted rounded-lg p-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevWeek}><ChevronLeft className="h-4 w-4" /></Button>
              <div className="text-sm font-semibold flex-1 sm:w-36 text-center">{format(currentDate, 'MMMM yyyy')}</div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextWeek}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>

        <Card className="border-border/50 overflow-hidden shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : (
              <div className="h-[700px] overflow-auto [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-500/70 [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-clip-content">
                <div className="min-w-[760px]">
                {/* Header */}
                <div className="grid grid-cols-8 border-b sticky top-0 bg-card z-10 shadow-sm">
                  <div className="p-3 border-r flex items-center justify-center text-xs font-medium text-muted-foreground bg-muted/30">
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  {weekDays.map((day, i) => {
                    const isToday = isSameDay(day, new Date());
                    return (
                      <div key={i} className={`p-3 text-center border-r last:border-r-0 ${isToday ? 'bg-primary/5' : ''}`}>
                        <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{format(day, 'EEE')}</div>
                        <div className={`text-xl font-bold mt-1 ${isToday ? 'text-primary' : ''}`}>
                          {format(day, 'd')}
                        </div>
                        {isToday && <div className="w-1.5 h-1.5 rounded-full bg-primary mx-auto mt-1" />}
                      </div>
                    );
                  })}
                </div>

                {/* Time grid */}
                <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-500/70 [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-clip-content">
                  {timeSlots.map((time, i) => (
                    <div key={i} className="grid grid-cols-8 border-b min-h-[80px]">
                      <div className="p-2 border-r text-xs text-muted-foreground text-center bg-muted/20 font-medium flex items-start justify-center pt-2">
                        {time}
                      </div>
                      {weekDays.map((day, j) => {
                        const hour = time.split(':')[0].padStart(2, '0');
                        const slotApts = (appointments ?? []).filter((a: any) => {
                          const aptDate = a.start?.substring(0, 10);
                          const dayStr = format(day, 'yyyy-MM-dd');
                          const aptHour = a.start?.substring(11, 13);
                          return aptDate === dayStr && aptHour === hour;
                        });
                        const isToday = isSameDay(day, new Date());

                        return (
                          <div
                            key={j}
                            className={`p-1 border-r last:border-r-0 transition-colors relative min-h-[80px] ${isToday ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/30'}`}
                          >
                            {slotApts.map((apt: any) => {
                              const colorClass = statusColors[apt.status] ?? "bg-blue-50 text-blue-800 border-blue-200";
                              return (
                                <button
                                  key={apt.id}
                                  onClick={() => setSelectedApt(apt)}
                                  className={`absolute inset-1 w-[calc(100%-8px)] cursor-pointer overflow-hidden rounded-lg border p-1.5 text-left text-xs shadow-sm transition-all hover:shadow-md ${colorClass}`}
                                  title={`${apt.patientName} - Dr. ${apt.doctorName}`}
                                >
                                  <div className="font-semibold truncate">{apt.patientName}</div>
                                  <div className="truncate opacity-80 mt-0.5 flex items-center gap-0.5">
                                    <Stethoscope className="w-2.5 h-2.5 inline" /> Dr. {apt.doctorName}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AppointmentDetailModal apt={selectedApt} onClose={() => setSelectedApt(null)} />
    </DashboardLayout>
  );
}
