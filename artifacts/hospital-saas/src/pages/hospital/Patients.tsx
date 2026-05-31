import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useListPatients, getListPatientsQueryKey, useCreatePatient } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Mail, Phone, ChevronLeft, ChevronRight, Users, CheckSquare, Square, X, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { addPatientSchema } from "@/lib/validations/patient";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function formatPhoneForUi(phone?: string | null) {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  return digits ? `+91-${digits}` : "";
}

function AddPatientDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: "", phone: "", email: "", dateOfBirth: "", gender: "",
    bloodGroup: "", address: "", emergencyContact: "", allergies: "",
  });

  const mutation = useCreatePatient();

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); }

  function handleSubmit() {
    const parsed = addPatientSchema.safeParse(form);
    if (!parsed.success) {
      toast({ variant: "destructive", title: parsed.error.issues[0]?.message ?? "Invalid input" });
      return;
    }
    const clean = parsed.data;
    mutation.mutate({
      data: {
        name: clean.name, phone: clean.phone,
        email: clean.email || undefined, dateOfBirth: clean.dateOfBirth || undefined,
        gender: clean.gender || undefined, bloodGroup: clean.bloodGroup || undefined,
        address: clean.address || undefined, emergencyContact: clean.emergencyContact || undefined,
        allergies: clean.allergies || undefined,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Patient registered" });
        onSuccess();
        onClose();
        setForm({ name: "", phone: "", email: "", dateOfBirth: "", gender: "", bloodGroup: "", address: "", emergencyContact: "", allergies: "" });
      },
      onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Register New Patient</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Full Name <span className="text-red-500">*</span></Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Patient full name" />
            </div>
            <div className="space-y-1">
              <Label>Phone <span className="text-red-500">*</span></Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">+91-</span>
                <Input
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10 digit phone"
                  maxLength={10}
                  inputMode="numeric"
                  className="pl-12"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="patient@email.com" />
            </div>
            <div className="space-y-1">
              <Label>Date of Birth</Label>
              <Input type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Blood Group</Label>
              <Select value={form.bloodGroup} onValueChange={(v) => set("bloodGroup", v)}>
                <SelectTrigger><SelectValue placeholder="Select blood group" /></SelectTrigger>
                <SelectContent className="max-h-64 overflow-y-auto">
                  {BLOOD_GROUPS.map((bg) => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Address</Label>
            <Textarea value={form.address} onChange={(e) => set("address", e.target.value)} rows={2} placeholder="Full address..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Emergency Contact</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">+91-</span>
                <Input
                  value={form.emergencyContact}
                  onChange={(e) => set("emergencyContact", e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10 digit emergency number"
                  maxLength={10}
                  inputMode="numeric"
                  className="pl-12"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Known Allergies</Label>
              <Input value={form.allergies} onChange={(e) => set("allergies", e.target.value)} placeholder="e.g. Penicillin" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "Registering..." : "Register Patient"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Patients() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const limit = 25;

  const { data, isLoading } = useListPatients(
    { search: search || undefined, page, limit },
    { query: { queryKey: getListPatientsQueryKey({ search: search || undefined, page, limit }) } }
  );

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListPatientsQueryKey() });
  }

  const totalPages = Math.ceil((data?.total ?? 0) / limit);
  const patients = (data?.patients ?? []).filter((patient: any) => {
    if (genderFilter === "ALL") return true;
    return (patient.gender ?? "").toUpperCase() === genderFilter;
  });
  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? patients.map((p: any) => p.id) : []);
  }
  function toggleOne(id: number, checked: boolean) {
    setSelectedIds((prev) => checked ? [...prev, id] : prev.filter((x) => x !== id));
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-6 sm:pb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Patients</h1>
            <p className="text-muted-foreground mt-2">Manage patient records and history</p>
          </div>
          <div className="flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:justify-end">
            <Button className="gap-2 px-3 w-full sm:w-auto" variant="outline" onClick={() => toggleSelectAll(selectedIds.length !== patients.length)}>
              {selectedIds.length === patients.length && patients.length > 0
                ? <CheckSquare className="w-4 h-4 text-purple-600" />
                : <Square className="w-4 h-4 text-slate-500" />}
              {selectedIds.length === patients.length && patients.length > 0 ? "Deselect all" : `Select all patients (${patients.length})`}
            </Button>
            <Button className="gap-2 cursor-pointer w-full sm:w-auto" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4" /> Add Patient
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <div className="relative w-full sm:w-auto sm:min-w-[320px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, ID, or phone..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="h-9 w-full pl-9"
                />
              </div>
              <Select value={genderFilter} onValueChange={setGenderFilter}>
                <SelectTrigger className="h-9 w-full sm:w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Gender</SelectItem>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Gender / Blood</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(10)].map((_, i) => (
                    <TableRow key={`patient-skeleton-${i}`}>
                      <TableCell><Skeleton className="h-5 w-5" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-56" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-6 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : patients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>No patients found</p>
                    </TableCell>
                  </TableRow>
                ) : patients.map((patient: any) => (
                  <TableRow key={patient.id} className={selectedIds.includes(patient.id) ? "bg-primary/5 border-primary/30" : ""}>
                    <TableCell>
                      <button onClick={() => toggleOne(patient.id, !selectedIds.includes(patient.id))} className="flex items-center justify-center w-5 h-5 cursor-pointer">
                        {selectedIds.includes(patient.id)
                          ? <CheckSquare className="w-5 h-5 text-purple-600" />
                          : <Square className="w-5 h-5 text-slate-400 hover:text-purple-600" />}
                      </button>
                    </TableCell>
                    <TableCell className="font-medium text-muted-foreground break-words">{patient.patientId}</TableCell>
                    <TableCell className="min-w-[220px] sm:min-w-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-medium text-xs shrink-0">
                          {patient.name.charAt(0)}
                        </div>
                        <p className="font-medium break-words">{patient.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {patient.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="w-3 h-3" /> {formatPhoneForUi(patient.phone)}
                          </div>
                        )}
                        {patient.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="w-3 h-3" /> {patient.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {patient.gender && <div className="text-sm capitalize">{patient.gender.toLowerCase()}</div>}
                        {patient.bloodGroup && <Badge variant="outline" className="text-xs">{patient.bloodGroup}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/hospital/patients/${patient.id}`}>
                        <Button variant="ghost" size="sm" className="cursor-pointer gap-1.5">
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, data?.total ?? 0)} of {data?.total ?? 0}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[min(92vw,760px)] rounded-2xl bg-slate-950 text-white px-4 py-3 shadow-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-violet-600 px-2 text-sm font-semibold">{selectedIds.length}</span>
            <span className="text-sm font-medium">patients selected</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="rounded-xl border border-white/30 bg-transparent text-white hover:bg-white/10 cursor-pointer" onClick={() => setSelectedIds([])}>Deselect</Button>
            <Button size="sm" className="rounded-xl border-0 bg-red-600 text-white hover:bg-red-500 shadow-none cursor-pointer" onClick={() => setDeleteOpen(true)}>Delete all</Button>
            <button className="ml-1 text-slate-300 hover:text-white cursor-pointer" onClick={() => setSelectedIds([])}><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected patients?</AlertDialogTitle>
            <AlertDialogDescription>
              You selected {selectedIds.length} patient(s). Bulk delete is not available for patients in current API.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setDeleteOpen(false); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddPatientDialog open={addOpen} onClose={() => setAddOpen(false)} onSuccess={invalidate} />
    </DashboardLayout>
  );
}
