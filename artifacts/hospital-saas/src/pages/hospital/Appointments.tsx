import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListAppointments, getListAppointmentsQueryKey,
  useListDoctors, getListDoctorsQueryKey,
  useListPatients, getListPatientsQueryKey,
  useGetAvailableSlots, getGetAvailableSlotsQueryKey,
  useCreateAppointment, useUpdateAppointment, useDeleteAppointment, useUpdateAppointmentStatus,
  useGetHospitalSettings, getGetHospitalSettingsQueryKey,
  useListDepartments, getListDepartmentsQueryKey,
} from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Calendar as CalendarIcon, Clock, Edit2, Trash2, MoreVertical, Search, Filter, CheckSquare, Square, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";

const statusColors: Record<string, string> = {
  COMPLETED: "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400",
  SCHEDULED: "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400",
  CONFIRMED: "bg-indigo-100 text-indigo-800 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400",
  IN_PROGRESS: "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400",
  CANCELLED: "bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400",
  NO_SHOW: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

function todayStr() {
  return new Date().toISOString().split("T")[0];
}
function nowTimeStr() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

interface BookDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editAppointment?: any;
  defaultDoctorId?: string;
}

function BookAppointmentDialog({ open, onClose, onSuccess, editAppointment, defaultDoctorId }: BookDialogProps) {
  const { toast } = useToast();
  const isEdit = !!editAppointment;

  const [patientId, setPatientId] = useState<string>("");
  const [doctorId, setDoctorId] = useState<string>("");
  const [date, setDate] = useState<string>(todayStr());
  const [time, setTime] = useState<string>("");
  const [appointmentType, setAppointmentType] = useState<string>("WALK_IN");
  const [symptoms, setSymptoms] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [patientSearch, setPatientSearch] = useState<string>("");

  const { data: settingsData } = useGetHospitalSettings({ query: { queryKey: getGetHospitalSettingsQueryKey() } });
  const settings = settingsData as any;
  const hospitalOpen = settings?.hospitalOpenTime ?? "08:00";
  const hospitalClose = settings?.hospitalCloseTime ?? "20:00";

  const { data: doctorsData } = useListDoctors(undefined, { query: { queryKey: getListDoctorsQueryKey() } });
  const { data: patientsData } = useListPatients(
    { search: patientSearch || undefined, limit: 50 },
    { query: { queryKey: getListPatientsQueryKey({ search: patientSearch || undefined, limit: 50 }), enabled: true } }
  );

  const slotsEnabled = !!doctorId && !!date;
  const { data: slots } = useGetAvailableSlots(
    { doctorId: doctorId ? parseInt(doctorId) : 0, date },
    { query: { queryKey: getGetAvailableSlotsQueryKey({ doctorId: doctorId ? parseInt(doctorId) : 0, date }), enabled: slotsEnabled } }
  );

  const createMutation = useCreateAppointment();
  const updateMutation = useUpdateAppointment();

  useEffect(() => {
    if (editAppointment && open) {
      setPatientId(String(editAppointment.patientId ?? ""));
      setDoctorId(String(editAppointment.doctorId ?? ""));
      setDate(editAppointment.appointmentDate ?? todayStr());
      setTime(editAppointment.appointmentTime ?? "");
      setAppointmentType(editAppointment.appointmentType ?? "WALK_IN");
      setSymptoms(editAppointment.symptoms ?? "");
      setNotes(editAppointment.notes ?? "");
    } else if (!editAppointment && open) {
      setPatientId("");
      setDoctorId(defaultDoctorId || "");
      setDate(todayStr());
      setTime("");
      setAppointmentType("WALK_IN");
      setSymptoms("");
      setNotes("");
      setPatientSearch("");
    }
  }, [editAppointment, open, defaultDoctorId]);

  const filteredSlots = (slots ?? []).filter((slot: any) => {
    const slotTime = slot.time;
    if (slotTime < hospitalOpen || slotTime >= hospitalClose) return false;
    if (date === todayStr() && slotTime <= nowTimeStr()) return false;
    return true;
  });

  // In edit mode, always ensure current time is selectable
  const currentTimeInSlots = isEdit && time && filteredSlots.find((s: any) => s.time === time);
  const showCurrentTimeOption = isEdit && time && !filteredSlots.find((s: any) => s.time === time && s.available);

  function handleSubmit() {
    if (!patientId || !doctorId || !date || !time) {
      toast({ variant: "destructive", title: "Missing fields", description: "Please fill all required fields." });
      return;
    }
    if (isEdit) {
      updateMutation.mutate(
        { id: editAppointment.id, data: { appointmentDate: date, appointmentTime: time, appointmentType, symptoms: symptoms || undefined, notes: notes || undefined } },
        {
          onSuccess: () => { toast({ title: "Appointment updated" }); onSuccess(); onClose(); },
          onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
        }
      );
    } else {
      createMutation.mutate(
        { data: { patientId: parseInt(patientId), doctorId: parseInt(doctorId), appointmentDate: date, appointmentTime: time, appointmentType, symptoms: symptoms || undefined, notes: notes || undefined } },
        {
          onSuccess: () => { toast({ title: "Appointment booked" }); onSuccess(); onClose(); },
          onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
        }
      );
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Appointment" : "Book Appointment"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {!isEdit && (
            <div className="space-y-1">
              <Label>Patient <span className="text-red-500">*</span></Label>
              <Input placeholder="Search patient..." value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} className="mb-1" />
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>
                  {patientsData?.patients?.map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name} {p.phone ? `— ${p.phone}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {isEdit && (
            <div className="space-y-1">
              <Label>Patient</Label>
              <Input value={editAppointment?.patientName ?? ""} disabled className="bg-muted" />
            </div>
          )}
          <div className="space-y-1">
            <Label>Doctor <span className="text-red-500">*</span></Label>
            <Select value={doctorId} onValueChange={(v) => { setDoctorId(v); if (!isEdit) setTime(""); }}>
              <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
              <SelectContent>
                {doctorsData?.map((d: any) => (
                  <SelectItem key={d.id} value={String(d.id)}>Dr. {d.name} {d.specialization ? `— ${d.specialization}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Date <span className="text-red-500">*</span></Label>
              <Input type="date" value={date} min={todayStr()} onChange={(e) => { setDate(e.target.value); setTime(""); }} />
            </div>
            <div className="space-y-1">
              <Label>Time <span className="text-red-500">*</span></Label>
              {slotsEnabled ? (
                <Select value={time} onValueChange={setTime}>
                  <SelectTrigger><SelectValue placeholder="Select slot" /></SelectTrigger>
                  <SelectContent className="max-h-64 overflow-y-auto">
                    {showCurrentTimeOption && (
                      <SelectItem value={time}>{time} (Current)</SelectItem>
                    )}
                    {filteredSlots.length === 0 && !showCurrentTimeOption ? (
                      <SelectItem value="_none" disabled>No slots available</SelectItem>
                    ) : filteredSlots.map((slot: any) => {
                      const isCurrentSlot = isEdit && slot.time === time;
                      return (
                        <SelectItem key={slot.time} value={slot.time} disabled={!slot.available && !isCurrentSlot}>
                          {slot.time} {!slot.available && !isCurrentSlot ? "(Booked)" : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ) : (
                <Input type="time" value={time} min={date === todayStr() ? nowTimeStr() : undefined} onChange={(e) => setTime(e.target.value)} placeholder="HH:MM" />
              )}
            </div>
          </div>
          {date === todayStr() && (
            <p className="text-xs text-amber-600 dark:text-amber-400">Showing only future time slots for today</p>
          )}
          <div className="space-y-1">
            <Label>Type</Label>
            <Select value={appointmentType} onValueChange={setAppointmentType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="WALK_IN">Walk-in</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="EMERGENCY">Emergency</SelectItem>
                <SelectItem value="FOLLOW_UP">Follow-up</SelectItem>
                <SelectItem value="ONLINE">Online</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Symptoms</Label>
            <Textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} placeholder="Chief complaints..." rows={2} />
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving..." : isEdit ? "Save Changes" : "Book Appointment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface StatusDialogProps {
  appointment: any;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function StatusUpdateDialog({ appointment, open, onClose, onSuccess }: StatusDialogProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<string>(appointment?.status ?? "");
  const [notes, setNotes] = useState<string>("");
  const updateStatus = useUpdateAppointmentStatus();

  useEffect(() => {
    if (appointment) { setStatus(appointment.status ?? ""); setNotes(""); }
  }, [appointment]);

  function handleSubmit() {
    updateStatus.mutate(
      { id: appointment.id, data: { status, notes: notes || undefined } },
      {
        onSuccess: () => { toast({ title: "Status updated" }); onSuccess(); onClose(); },
        onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Update Status</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="NO_SHOW">No Show</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={updateStatus.isPending}>
            {updateStatus.isPending ? "Saving..." : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AppointmentDetailDialog({ appointment, open, onClose }: { appointment: any; open: boolean; onClose: () => void }) {
  if (!appointment) return null;
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Appointment Details</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Patient</p>
              <p className="font-semibold">{appointment.patientName}</p>
              {appointment.patientPhone && <p className="text-sm text-muted-foreground">{appointment.patientPhone}</p>}
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Doctor</p>
              <p className="font-semibold">Dr. {appointment.doctorName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Date</p>
              <p className="font-medium">{new Date(appointment.appointmentDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Time</p>
              <p className="font-medium">{appointment.appointmentTime}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Token</p>
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary font-bold text-sm">
                {appointment.tokenNumber}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Type</p>
              <p className="text-sm capitalize">{appointment.appointmentType?.replace(/_/g, " ")}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Status</p>
            <Badge className={statusColors[appointment.status] ?? "bg-gray-100 text-gray-800"}>
              {appointment.status?.replace(/_/g, " ")}
            </Badge>
          </div>
          {appointment.symptoms && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Symptoms</p>
              <p className="text-sm bg-muted/50 rounded p-2">{appointment.symptoms}</p>
            </div>
          )}
          {appointment.notes && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Notes</p>
              <p className="text-sm bg-muted/50 rounded p-2">{appointment.notes}</p>
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

export function Appointments() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const isDoctor = user?.role === "DOCTOR";

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [doctorFilter, setDoctorFilter] = useState<string>("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [bookOpen, setBookOpen] = useState(false);
  const [editApt, setEditApt] = useState<any>(null);
  const [deleteApt, setDeleteApt] = useState<any>(null);
  const [statusApt, setStatusApt] = useState<any>(null);
  const [detailApt, setDetailApt] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const { data: doctorsData } = useListDoctors(undefined, { query: { queryKey: getListDoctorsQueryKey() } });
  const { data: departmentsData } = useListDepartments({ query: { queryKey: getListDepartmentsQueryKey() } });

  // Find current doctor's ID from doctor list
  const myDoctorRecord = isDoctor && doctorsData ? (doctorsData as any[]).find((d: any) => d.userId === user?.id) : null;
  const myDoctorId = myDoctorRecord ? String(myDoctorRecord.id) : "";

  // Auto-set filter for doctors
  useEffect(() => {
    if (isDoctor && myDoctorId && !doctorFilter) {
      setDoctorFilter(myDoctorId);
    }
  }, [isDoctor, myDoctorId]);

  const queryParams = {
    status: statusFilter && statusFilter !== "all" ? statusFilter : undefined,
    doctorId: doctorFilter && doctorFilter !== "all" ? parseInt(doctorFilter) : undefined,
    departmentId: departmentFilter && departmentFilter !== "all" ? parseInt(departmentFilter) : undefined,
    page: 1,
    limit: 100,
  };

  const { data, isLoading } = useListAppointments(
    queryParams,
    { query: { queryKey: getListAppointmentsQueryKey(queryParams) } }
  );

  const deleteMutation = useDeleteAppointment();

  // Client-side search filter
  const appointments = (data?.appointments ?? []).filter((apt) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      apt.patientName?.toLowerCase().includes(q) ||
      (apt as any).patientPhone?.toLowerCase().includes(q) ||
      apt.doctorName?.toLowerCase().includes(q)
    );
  });

  function handleDelete() {
    if (!deleteApt) return;
    deleteMutation.mutate(
      { id: deleteApt.id },
      {
        onSuccess: () => {
          toast({ title: "Appointment deleted" });
          setDeleteApt(null);
          queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
        },
        onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
      }
    );
  }

  function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    let completed = 0;
    let failed = 0;
    ids.forEach(id => {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          completed++;
          if (completed + failed === ids.length) {
            toast({ title: `Deleted ${completed} appointment(s)` });
            setSelectedIds(new Set());
            setBulkDeleteOpen(false);
            queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
          }
        },
        onError: () => {
          failed++;
          if (completed + failed === ids.length) {
            toast({ variant: "destructive", title: `${failed} deletion(s) failed` });
            setSelectedIds(new Set());
            setBulkDeleteOpen(false);
            queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
          }
        },
      });
    });
  }

  function toggleSelect(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === appointments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(appointments.map(a => a.id)));
    }
  }

  function onSuccess() {
    queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
  }

  const defaultDoctorId = isDoctor ? myDoctorId : "";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
            <p className="text-muted-foreground mt-1">
              {isDoctor ? "Your patient appointments" : "Manage all patient appointments"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2 px-3"
              onClick={toggleSelectAll}
            >
              {selectedIds.size === appointments.length && appointments.length > 0
                ? <CheckSquare className="w-4 h-4 text-purple-600" />
                : <Square className="w-4 h-4 text-slate-500" />}
              {selectedIds.size === appointments.length && appointments.length > 0 ? "Deselect all" : `Select all appointments (${appointments.length})`}
            </Button>
            {!isDoctor && (
              <Button className="gap-2 cursor-pointer" onClick={() => setBookOpen(true)}>
                <Plus className="w-4 h-4" /> Book Appointment
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader className="py-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search patient, phone, doctor..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                    <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="NO_SHOW">No Show</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={departmentFilter} onValueChange={(v) => { setDepartmentFilter(v); if (!isDoctor) setDoctorFilter(""); }}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {(departmentsData as any[])?.map((dept: any) => (
                      <SelectItem key={dept.id} value={String(dept.id)}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isDoctor && (
                  <Select value={doctorFilter} onValueChange={setDoctorFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="All Doctors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Doctors</SelectItem>
                      {(doctorsData as any[])?.filter((d: any) => {
                        if (!departmentFilter || departmentFilter === "all") return true;
                        return String(d.departmentId) === departmentFilter;
                      }).map((d: any) => (
                        <SelectItem key={d.id} value={String(d.id)}>Dr. {d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {isDoctor && (
                  <div className="flex gap-2">
                    <Button
                      variant={doctorFilter === myDoctorId ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDoctorFilter(myDoctorId)}
                    >
                      My Appointments
                    </Button>
                    {departmentFilter && departmentFilter !== "all" && (
                      <Button
                        variant={doctorFilter === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDoctorFilter("all")}
                      >
                        All in Department
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(10)].map((_, i) => (
                    <TableRow key={`appointment-skeleton-${i}`}>
                      <TableCell><Skeleton className="h-5 w-5" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-md" /></TableCell>
                    </TableRow>
                  ))
                ) : appointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>No appointments found</p>
                    </TableCell>
                  </TableRow>
                ) : appointments.map((apt) => (
                  <TableRow
                    key={apt.id}
                    className={selectedIds.has(apt.id) ? "bg-primary/5" : ""}
                  >
                    <TableCell>
                      <button onClick={() => toggleSelect(apt.id)} className="flex items-center justify-center w-5 h-5 cursor-pointer">
                        {selectedIds.has(apt.id)
                          ? <CheckSquare className="w-5 h-5 text-purple-600" />
                          : <Square className="w-5 h-5 text-slate-400 hover:text-purple-600" />}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{apt.patientName}</div>
                      {(apt as any).patientPhone && <div className="text-xs text-muted-foreground">{(apt as any).patientPhone}</div>}
                    </TableCell>
                    <TableCell>Dr. {apt.doctorName}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5 text-sm">
                        <div className="flex items-center gap-1.5">
                          <CalendarIcon className="w-3 h-3 text-muted-foreground" />
                          {new Date(apt.appointmentDate + "T00:00:00").toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          {apt.appointmentTime}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-secondary-foreground font-bold text-xs">
                        {apt.tokenNumber}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground capitalize">{apt.appointmentType?.replace(/_/g, " ")}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[apt.status] ?? "bg-gray-100 text-gray-800"}>
                        {apt.status?.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setDetailApt(apt)}>
                            <CalendarIcon className="w-4 h-4 mr-2" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditApt(apt)}>
                            <Edit2 className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setStatusApt(apt)}>
                            <Clock className="w-4 h-4 mr-2" /> Update Status
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteApt(apt)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[min(92vw,760px)] rounded-2xl bg-slate-950 text-white px-4 py-3 shadow-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-violet-600 px-2 text-sm font-semibold">{selectedIds.size}</span>
            <span className="text-sm font-medium">appointments selected</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="rounded-xl border border-white/30 bg-transparent text-white hover:bg-white/10 cursor-pointer" onClick={() => setSelectedIds(new Set())}>Deselect</Button>
            <Button size="sm" className="rounded-xl border-0 bg-red-600 text-white hover:bg-red-500 shadow-none cursor-pointer" onClick={() => setBulkDeleteOpen(true)}>Delete all</Button>
            <button className="ml-1 text-slate-300 hover:text-white cursor-pointer" onClick={() => setSelectedIds(new Set())}><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      <BookAppointmentDialog
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        onSuccess={onSuccess}
        defaultDoctorId={defaultDoctorId}
      />
      <BookAppointmentDialog
        open={!!editApt}
        onClose={() => setEditApt(null)}
        onSuccess={onSuccess}
        editAppointment={editApt}
      />
      {statusApt && (
        <StatusUpdateDialog
          appointment={statusApt}
          open={!!statusApt}
          onClose={() => setStatusApt(null)}
          onSuccess={onSuccess}
        />
      )}
      <AppointmentDetailDialog
        appointment={detailApt}
        open={!!detailApt}
        onClose={() => setDetailApt(null)}
      />

      {/* Single delete confirmation */}
      <AlertDialog open={!!deleteApt} onOpenChange={(v) => { if (!v) setDeleteApt(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the appointment for <strong>{deleteApt?.patientName}</strong> on {deleteApt?.appointmentDate} at {deleteApt?.appointmentTime}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Appointments?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected {selectedIds.size} appointment(s). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
