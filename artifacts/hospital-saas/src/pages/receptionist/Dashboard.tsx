import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetReceptionistDashboard, getGetReceptionistDashboardQueryKey,
  useListAppointments, getListAppointmentsQueryKey,
  useUpdateAppointmentStatus,
  useListDoctors, getListDoctorsQueryKey,
  useCreateAppointment,
  useListPatients, getListPatientsQueryKey,
  useGetAvailableSlots, getGetAvailableSlotsQueryKey,
  useGetHospitalSettings, getGetHospitalSettingsQueryKey,
} from "@workspace/api-client-react";
import { CreateInvoiceDialog } from "@/pages/hospital/Invoices";
import { useCurrency } from "@/lib/currency";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Users, Clock, Activity, IndianRupee, Plus, RefreshCw,
  CheckCircle2, XCircle, Megaphone, Calendar as CalIcon,
  UserCheck, AlertCircle, Stethoscope, FileText
} from "lucide-react";

function todayStr() { return new Date().toISOString().split("T")[0]; }
function nowTimeStr() {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; ring: string }> = {
  SCHEDULED:  { label: "Waiting",     color: "text-blue-700",   bg: "bg-blue-50",   ring: "ring-blue-200" },
  CONFIRMED:  { label: "Confirmed",   color: "text-indigo-700", bg: "bg-indigo-50", ring: "ring-indigo-200" },
  IN_PROGRESS:{ label: "With Doctor", color: "text-amber-700",  bg: "bg-amber-50",  ring: "ring-amber-200" },
  COMPLETED:  { label: "Done",        color: "text-green-700",  bg: "bg-green-50",  ring: "ring-green-200" },
  CANCELLED:  { label: "Cancelled",   color: "text-red-700",    bg: "bg-red-50",    ring: "ring-red-200" },
  NO_SHOW:    { label: "No Show",     color: "text-gray-600",   bg: "bg-gray-50",   ring: "ring-gray-200" },
};

const NEXT_STATUS: Record<string, { status: string; label: string; icon: React.ElementType; variant: "default" | "outline" | "destructive" | "secondary" }> = {
  SCHEDULED:   { status: "CONFIRMED",   label: "Confirm",    icon: UserCheck,    variant: "outline" },
  CONFIRMED:   { status: "IN_PROGRESS", label: "Call In",    icon: Megaphone,    variant: "default" },
  IN_PROGRESS: { status: "COMPLETED",   label: "Complete",   icon: CheckCircle2, variant: "default" },
};

// ─── Book Appointment Dialog ─────────────────────────────────────────────────
function BookDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState("");
  const [appointmentType, setAppointmentType] = useState("WALK_IN");
  const [symptoms, setSymptoms] = useState("");
  const [patientSearch, setPatientSearch] = useState("");

  const { data: settingsData } = useGetHospitalSettings({ query: { queryKey: getGetHospitalSettingsQueryKey() } });
  const settings = settingsData as any;
  const hospitalOpen  = settings?.hospitalOpenTime  ?? "08:00";
  const hospitalClose = settings?.hospitalCloseTime ?? "20:00";

  const { data: doctors } = useListDoctors(undefined, { query: { queryKey: getListDoctorsQueryKey() } });
  const { data: patientsData } = useListPatients(
    { search: patientSearch || undefined, limit: 50 },
    { query: { queryKey: getListPatientsQueryKey({ search: patientSearch || undefined, limit: 50 }) } }
  );

  const slotsEnabled = !!doctorId && !!date;
  const { data: slots } = useGetAvailableSlots(
    { doctorId: doctorId ? parseInt(doctorId) : 0, date },
    { query: { queryKey: getGetAvailableSlotsQueryKey({ doctorId: doctorId ? parseInt(doctorId) : 0, date }), enabled: slotsEnabled } }
  );

  const filteredSlots = (slots ?? []).filter((s: any) => {
    if (s.time < hospitalOpen || s.time >= hospitalClose) return false;
    if (date === todayStr() && s.time <= nowTimeStr()) return false;
    return true;
  });

  const createMutation = useCreateAppointment();

  useEffect(() => {
    if (!open) { setPatientId(""); setDoctorId(""); setDate(todayStr()); setTime(""); setSymptoms(""); setPatientSearch(""); }
  }, [open]);

  function handleSubmit() {
    if (!patientId || !doctorId || !date || !time) {
      toast({ variant: "destructive", title: "Fill all required fields" }); return;
    }
    createMutation.mutate(
      { data: { patientId: parseInt(patientId), doctorId: parseInt(doctorId), appointmentDate: date, appointmentTime: time, appointmentType, symptoms: symptoms || undefined } },
      {
        onSuccess: () => { toast({ title: "Appointment booked" }); onSuccess(); onClose(); },
        onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Book Appointment</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Patient <span className="text-red-500">*</span></Label>
            <Input placeholder="Search by name or phone..." value={patientSearch} onChange={e => setPatientSearch(e.target.value)} className="mb-1" />
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
              <SelectContent>
                {patientsData?.patients?.map((p: any) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}{p.phone ? ` — ${p.phone}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Doctor <span className="text-red-500">*</span></Label>
            <Select value={doctorId} onValueChange={v => { setDoctorId(v); setTime(""); }}>
              <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
              <SelectContent>
                {doctors?.map((d: any) => (
                  <SelectItem key={d.id} value={String(d.id)}>Dr. {d.name}{d.specialization ? ` — ${d.specialization}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Date <span className="text-red-500">*</span></Label>
              <Input type="date" value={date} min={todayStr()} onChange={e => { setDate(e.target.value); setTime(""); }} />
            </div>
            <div className="space-y-1">
              <Label>Time Slot <span className="text-red-500">*</span></Label>
              {slotsEnabled ? (
                <Select value={time} onValueChange={setTime}>
                  <SelectTrigger><SelectValue placeholder="Select slot" /></SelectTrigger>
                  <SelectContent>
                    {filteredSlots.length === 0
                      ? <SelectItem value="_none" disabled>No slots available</SelectItem>
                      : filteredSlots.map((s: any) => (
                          <SelectItem key={s.time} value={s.time} disabled={!s.available}>
                            {s.time}{!s.available ? " (Booked)" : ""}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
              )}
            </div>
          </div>
          {date === todayStr() && <p className="text-xs text-amber-600">Only future slots shown for today</p>}
          <div className="space-y-1">
            <Label>Type</Label>
            <Select value={appointmentType} onValueChange={setAppointmentType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="WALK_IN">Walk-in</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="EMERGENCY">Emergency</SelectItem>
                <SelectItem value="FOLLOW_UP">Follow-up</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Symptoms</Label>
            <Textarea value={symptoms} onChange={e => setSymptoms(e.target.value)} rows={2} placeholder="Chief complaints..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Booking..." : "Book Appointment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Token Badge ─────────────────────────────────────────────────────────────
function TokenBadge({ n, status }: { n: number; status: string }) {
  const cfg = STATUS_CONFIG[status];
  const isActive = status === "IN_PROGRESS";
  return (
    <div className={`
      relative flex items-center justify-center w-11 h-11 rounded-full font-bold text-base
      ${isActive ? "bg-amber-500 text-white shadow-lg shadow-amber-200 animate-pulse" : `${cfg?.bg ?? "bg-muted"} ${cfg?.color ?? "text-foreground"}`}
      ring-2 ${cfg?.ring ?? "ring-muted"} flex-shrink-0
    `}>
      {n}
      {isActive && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-500 border-2 border-white" />}
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export function ReceptionistDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { format: fmt } = useCurrency();
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [bookOpen, setBookOpen] = useState(false);
  const [callingToken, setCallingToken] = useState<number | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [countdown, setCountdown] = useState(30);
  const [invoicePrefill, setInvoicePrefill] = useState<{ patientId?: number; doctorId?: number } | null>(null);

  const today = todayStr();

  const { data: dashData } = useGetReceptionistDashboard({
    query: { queryKey: getGetReceptionistDashboardQueryKey(), refetchInterval: 30000 }
  });

  const { data: doctors } = useListDoctors(undefined, { query: { queryKey: getListDoctorsQueryKey() } });

  const queueParams = {
    date: today,
    status: undefined,
    doctorId: doctorFilter !== "all" ? parseInt(doctorFilter) : undefined,
    page: 1,
    limit: 100,
  };

  const { data: queueData, isLoading: queueLoading } = useListAppointments(
    queueParams,
    { query: { queryKey: getListAppointmentsQueryKey(queueParams), refetchInterval: 30000 } }
  );

  const updateStatus = useUpdateAppointmentStatus();

  // Sort appointments by token number
  const allQueue = [...(queueData?.appointments ?? [])].sort((a, b) => (a.tokenNumber ?? 0) - (b.tokenNumber ?? 0));
  const activeQueue = allQueue.filter(a => !["CANCELLED", "NO_SHOW", "COMPLETED"].includes(a.status));
  const completedQueue = allQueue.filter(a => ["COMPLETED"].includes(a.status));
  const cancelledQueue = allQueue.filter(a => ["CANCELLED", "NO_SHOW"].includes(a.status));

  const currentlyServing = allQueue.find(a => a.status === "IN_PROGRESS");
  const nextWaiting = allQueue.find(a => a.status === "SCHEDULED" || a.status === "CONFIRMED");

  function invalidateQueue() {
    queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetReceptionistDashboardQueryKey() });
    setLastRefresh(new Date());
    setCountdown(30);
  }

  function handleStatusChange(aptId: number, status: string, tokenNum: number) {
    if (status === "IN_PROGRESS") setCallingToken(tokenNum);
    updateStatus.mutate(
      { id: aptId, data: { status } },
      {
        onSuccess: () => {
          invalidateQueue();
          if (status === "IN_PROGRESS") {
            toast({ title: `Token #${tokenNum} called`, description: "Patient has been called in." });
            setTimeout(() => setCallingToken(null), 3000);
          }
        },
        onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
      }
    );
  }

  function handleCallNext() {
    if (!nextWaiting) return;
    handleStatusChange(nextWaiting.id, "IN_PROGRESS", nextWaiting.tokenNumber ?? 0);
  }

  function handleMarkNoShow(aptId: number) {
    updateStatus.mutate(
      { id: aptId, data: { status: "NO_SHOW" } },
      {
        onSuccess: () => { invalidateQueue(); toast({ title: "Marked as No Show" }); },
        onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
      }
    );
  }

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { setLastRefresh(new Date()); return 30; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    { label: "Today's Total", value: allQueue.length, icon: Users, color: "text-primary" },
    { label: "Waiting", value: allQueue.filter(a => a.status === "SCHEDULED" || a.status === "CONFIRMED").length, icon: Clock, color: "text-amber-500" },
    { label: "With Doctor", value: allQueue.filter(a => a.status === "IN_PROGRESS").length, icon: Activity, color: "text-blue-500" },
    { label: "Completed", value: completedQueue.length, icon: CheckCircle2, color: "text-green-500" },
    { label: "Daily Collection", value: fmt(Number(dashData?.dailyCollection ?? 0)), icon: IndianRupee, color: "text-emerald-600", wide: true },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Front Desk</h1>
            <p className="text-muted-foreground mt-1">Live patient queue for {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> {countdown}s
            </span>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={invalidateQueue}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
            <Button className="gap-1.5" onClick={() => setBookOpen(true)}>
              <Plus className="w-4 h-4" /> Book Appointment
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {stats.map((s, i) => (
            <Card key={i} className={s.wide ? "col-span-2 sm:col-span-1" : ""}>
              <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">{s.label}</CardTitle>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </CardHeader>
              <CardContent className="pb-3 pt-0 px-4">
                <div className="text-2xl font-bold">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Currently Serving Banner */}
        {currentlyServing && (
          <div className="flex items-center gap-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-500 text-white font-bold text-xl shadow-lg animate-pulse flex-shrink-0">
              {currentlyServing.tokenNumber}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-0.5">Now Serving</div>
              <div className="font-semibold text-lg truncate">{currentlyServing.patientName}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5" />
                Dr. {currentlyServing.doctorName} · {currentlyServing.appointmentTime}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50 flex-shrink-0"
              onClick={() => handleStatusChange(currentlyServing.id, "COMPLETED", currentlyServing.tokenNumber ?? 0)}
            >
              <CheckCircle2 className="w-4 h-4" /> Mark Done
            </Button>
          </div>
        )}

        {/* Call Next Panel */}
        {nextWaiting && !currentlyServing && (
          <div className="flex items-center gap-4 bg-primary/5 border border-primary/20 rounded-xl p-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-lg flex-shrink-0">
              {nextWaiting.tokenNumber}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide text-primary/70 mb-0.5">Next Up</div>
              <div className="font-semibold truncate">{nextWaiting.patientName}</div>
              <div className="text-sm text-muted-foreground">Dr. {nextWaiting.doctorName} · {nextWaiting.appointmentTime}</div>
            </div>
            <Button className="gap-1.5 flex-shrink-0" onClick={handleCallNext}>
              <Megaphone className="w-4 h-4" /> Call Token #{nextWaiting.tokenNumber}
            </Button>
          </div>
        )}

        {/* Calling Animation */}
        {callingToken && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="bg-amber-500 text-white rounded-2xl shadow-2xl px-12 py-8 text-center animate-bounce">
              <div className="text-6xl font-black mb-2">{callingToken}</div>
              <div className="text-xl font-semibold">Token #{callingToken}</div>
              <div className="text-sm opacity-80 mt-1">Please proceed to the doctor</div>
            </div>
          </div>
        )}

        {/* Doctor Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setDoctorFilter("all")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${doctorFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            All Doctors
          </button>
          {doctors?.map((d: any) => (
            <button
              key={d.id}
              onClick={() => setDoctorFilter(String(d.id))}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${doctorFilter === String(d.id) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              Dr. {d.name}
            </button>
          ))}
        </div>

        {/* Live Queue */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalIcon className="w-4 h-4 text-primary" />
                Today's Queue
                <Badge variant="secondary" className="ml-1">{activeQueue.length} active</Badge>
              </CardTitle>
              <span className="text-xs text-muted-foreground">Last updated {lastRefresh.toLocaleTimeString()}</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {queueLoading ? (
              <div className="py-12 text-center text-muted-foreground">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3" />
                Loading queue...
              </div>
            ) : activeQueue.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Queue is empty</p>
                <p className="text-sm mt-1">No active appointments for today</p>
                <Button variant="outline" className="mt-4 gap-1.5" onClick={() => setBookOpen(true)}>
                  <Plus className="w-4 h-4" /> Book First Appointment
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {activeQueue.map((apt) => {
                  const cfg = STATUS_CONFIG[apt.status] ?? STATUS_CONFIG.SCHEDULED;
                  const next = NEXT_STATUS[apt.status];
                  return (
                    <div key={apt.id} className={`flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/30 ${apt.status === "IN_PROGRESS" ? "bg-amber-50/50 dark:bg-amber-900/10" : ""}`}>
                      <TokenBadge n={apt.tokenNumber ?? 0} status={apt.status} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{apt.patientName}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-3">
                          <span className="flex items-center gap-1"><Stethoscope className="w-3 h-3" /> Dr. {apt.doctorName}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {apt.appointmentTime}</span>
                          {apt.patientPhone && <span className="hidden sm:inline text-xs opacity-70">{apt.patientPhone}</span>}
                        </div>
                        {apt.symptoms && <div className="text-xs text-muted-foreground mt-0.5 truncate italic">"{apt.symptoms}"</div>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color} ring-1 ${cfg.ring}`}>
                          {cfg.label}
                        </span>
                        {next && (
                          <Button
                            size="sm"
                            variant={next.variant}
                            className="gap-1.5 h-8 text-xs"
                            onClick={() => handleStatusChange(apt.id, next.status, apt.tokenNumber ?? 0)}
                            disabled={updateStatus.isPending}
                          >
                            <next.icon className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{next.label}</span>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                          title="Create Invoice"
                          onClick={() => setInvoicePrefill({ patientId: (apt as any).patientId, doctorId: (apt as any).doctorId })}
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          title="Mark No Show"
                          onClick={() => handleMarkNoShow(apt.id)}
                          disabled={updateStatus.isPending}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completed today */}
        {completedQueue.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Completed Today ({completedQueue.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {completedQueue.map((apt) => (
                  <div key={apt.id} className="flex items-center gap-4 px-4 py-2.5 opacity-70">
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-green-50 text-green-700 font-bold text-sm ring-1 ring-green-200 flex-shrink-0">
                      {apt.tokenNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{apt.patientName}</div>
                      <div className="text-xs text-muted-foreground">Dr. {apt.doctorName} · {apt.appointmentTime}</div>
                    </div>
                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Done
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cancelled / No Show */}
        {cancelledQueue.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                <AlertCircle className="w-4 h-4 text-red-400" />
                Cancelled / No Show ({cancelledQueue.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {cancelledQueue.map((apt) => (
                  <div key={apt.id} className="flex items-center gap-4 px-4 py-2.5 opacity-60">
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-red-50 text-red-400 font-bold text-sm ring-1 ring-red-200 flex-shrink-0">
                      {apt.tokenNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{apt.patientName}</div>
                      <div className="text-xs text-muted-foreground">Dr. {apt.doctorName} · {apt.appointmentTime}</div>
                    </div>
                    <Badge variant="outline" className="text-xs text-red-600 border-red-200">{apt.status === "NO_SHOW" ? "No Show" : "Cancelled"}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <BookDialog open={bookOpen} onClose={() => setBookOpen(false)} onSuccess={invalidateQueue} />
      <CreateInvoiceDialog
        open={!!invoicePrefill}
        onClose={() => setInvoicePrefill(null)}
        onSuccess={() => setInvoicePrefill(null)}
        prefillPatientId={invoicePrefill?.patientId}
        prefillDoctorId={invoicePrefill?.doctorId}
      />
    </DashboardLayout>
  );
}
