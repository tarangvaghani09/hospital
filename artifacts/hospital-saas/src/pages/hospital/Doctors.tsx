import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListDoctors, getListDoctorsQueryKey,
  useCreateDoctor, useDeleteDoctor,
  useListDepartments, getListDepartmentsQueryKey,
} from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Mail, Phone, CheckSquare, Square, X, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { addDoctorSchema } from "@/lib/validations/doctor";

function formatPhoneForUi(phone?: string | null) {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  return digits ? `+91-${digits}` : "";
}

function AddDoctorDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: "",
    specialization: "", qualification: "", experience: "",
    consultationFee: "", departmentId: "",
  });
  const [showPwd, setShowPwd] = useState(false);

  const { data: departments } = useListDepartments({ query: { queryKey: getListDepartmentsQueryKey() } });
  const mutation = useCreateDoctor();

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); }

  function handleSubmit() {
    const parsed = addDoctorSchema.safeParse(form);
    if (!parsed.success) {
      toast({ variant: "destructive", title: parsed.error.issues[0]?.message ?? "Invalid input" });
      return;
    }
    const clean = parsed.data;
    mutation.mutate({
      data: {
        name: clean.name,
        email: clean.email,
        password: clean.password,
        phone: clean.phone || undefined,
        specialization: clean.specialization || undefined,
        qualification: clean.qualification || undefined,
        experience: clean.experience ? parseInt(clean.experience) : undefined,
        consultationFee: clean.consultationFee ? parseFloat(clean.consultationFee) : undefined,
        departmentId: clean.departmentId ? parseInt(clean.departmentId) : undefined,
      }
    }, {
      onSuccess: () => { toast({ title: "Doctor account created" }); onSuccess(); onClose(); },
      onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add Doctor</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Full Name <span className="text-red-500">*</span></Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Dr. Full Name" />
            </div>
            <div className="space-y-1">
              <Label>Email <span className="text-red-500">*</span></Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="doctor@hospital.com" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Password <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Input
                  type={showPwd ? "text" : "password"}
                  value={form.password} onChange={(e) => set("password", e.target.value)}
                  placeholder="Min. 6 characters"
                  className="pr-16"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground" onClick={() => setShowPwd(s => !s)}>
                  {showPwd ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
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
              <Label>Department</Label>
              <Select value={form.departmentId} onValueChange={(v) => set("departmentId", v)}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent className="max-h-64 overflow-y-auto">
                  <SelectItem value="_none">None</SelectItem>
                  {departments?.map((d: any) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Specialization</Label>
              <Input value={form.specialization} onChange={(e) => set("specialization", e.target.value)} placeholder="e.g. Cardiologist" />
            </div>
            <div className="space-y-1">
              <Label>Qualification</Label>
              <Input value={form.qualification} onChange={(e) => set("qualification", e.target.value)} placeholder="e.g. MBBS, MD" />
            </div>
            <div className="space-y-1">
              <Label>Experience (years)</Label>
              <Input type="number" value={form.experience} onChange={(e) => set("experience", e.target.value)} min={0} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label>Consultation Fee (₹)</Label>
              <Input type="number" value={form.consultationFee} onChange={(e) => set("consultationFee", e.target.value)} min={0} placeholder="500" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "Creating..." : "Create Doctor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Doctors() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [addOpen, setAddOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteDoctor = useDeleteDoctor();

  const { data, isLoading } = useListDoctors(
    { search: search || undefined },
    { query: { queryKey: getListDoctorsQueryKey({ search: search || undefined }) } }
  );
  const doctors = (data ?? []).filter((d: any) => {
    if (statusFilter === "ACTIVE") return d.isActive !== false;
    if (statusFilter === "INACTIVE") return d.isActive === false;
    return true;
  });

  function invalidate() { queryClient.invalidateQueries({ queryKey: getListDoctorsQueryKey() }); }
  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? doctors.map((d: any) => d.id) : []);
  }
  function toggleOne(id: number, checked: boolean) {
    setSelectedIds((prev) => checked ? [...prev, id] : prev.filter((x) => x !== id));
  }
  async function handleDeleteSelected() {
    const ids = [...selectedIds];
    const results = await Promise.allSettled(ids.map((id) => deleteDoctor.mutateAsync({ id })));
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const fail = results.length - ok;
    if (ok) toast({ title: `Deleted ${ok} doctor(s)` });
    if (fail) toast({ variant: "destructive", title: `${fail} deletion(s) failed` });
    setSelectedIds([]);
    setDeleteOpen(false);
    invalidate();
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Doctors</h1>
            <p className="text-muted-foreground mt-2">Manage hospital doctors and their schedules</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2 px-3"
              onClick={() => toggleSelectAll(selectedIds.length !== doctors.length)}
            >
              {selectedIds.length === doctors.length && doctors.length > 0
                ? <CheckSquare className="w-4 h-4 text-purple-600" />
                : <Square className="w-4 h-4 text-slate-500" />}
              {selectedIds.length === doctors.length && doctors.length > 0 ? "Deselect all" : `Select all doctors (${doctors.length})`}
            </Button>
            <Button className="gap-2 cursor-pointer" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4" /> Add Doctor
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search doctors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(10)].map((_, i) => (
                    <TableRow key={`doctor-skeleton-${i}`}>
                      <TableCell><Skeleton className="h-5 w-5" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-56" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-6 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : doctors.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No doctors found</TableCell></TableRow>
                ) : doctors.map((doctor) => (
                  <TableRow key={doctor.id} className={selectedIds.includes(doctor.id) ? "bg-primary/5 border-primary/30" : ""}>
                    <TableCell>
                      <button onClick={() => toggleOne(doctor.id, !selectedIds.includes(doctor.id))} className="flex items-center justify-center w-5 h-5 cursor-pointer">
                        {selectedIds.includes(doctor.id)
                          ? <CheckSquare className="w-5 h-5 text-purple-600" />
                          : <Square className="w-5 h-5 text-slate-400 hover:text-purple-600" />}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                          {doctor.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{doctor.name}</p>
                          <p className="text-xs text-muted-foreground">{doctor.specialization}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">{doctor.departmentName || "General"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-3 h-3" /> {doctor.email}
                        </div>
                        {doctor.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="w-3 h-3" /> {formatPhoneForUi(doctor.phone)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {doctor.isActive !== false ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/hospital/doctors/${doctor.id}`}>
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
      </div>
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[min(92vw,760px)] rounded-2xl bg-slate-950 text-white px-4 py-3 shadow-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-violet-600 px-2 text-sm font-semibold">{selectedIds.length}</span>
            <span className="text-sm font-medium">doctors selected</span>
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
            <AlertDialogTitle>Delete selected doctors?</AlertDialogTitle>
            <AlertDialogDescription>
              You are deleting {selectedIds.length} selected doctor(s). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Selected
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddDoctorDialog open={addOpen} onClose={() => setAddOpen(false)} onSuccess={invalidate} />
    </DashboardLayout>
  );
}
