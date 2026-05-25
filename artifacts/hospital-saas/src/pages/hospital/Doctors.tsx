import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListDoctors, getListDoctorsQueryKey,
  useCreateDoctor,
  useListDepartments, getListDepartmentsQueryKey,
} from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Mail, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

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
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      toast({ variant: "destructive", title: "Name, email and password are required" }); return;
    }
    if (form.password.length < 6) {
      toast({ variant: "destructive", title: "Password must be at least 6 characters" }); return;
    }
    mutation.mutate({
      data: {
        name: form.name, email: form.email, password: form.password,
        phone: form.phone || undefined,
        specialization: form.specialization || undefined,
        qualification: form.qualification || undefined,
        experience: form.experience ? parseInt(form.experience) : undefined,
        consultationFee: form.consultationFee ? parseFloat(form.consultationFee) : undefined,
        departmentId: form.departmentId ? parseInt(form.departmentId) : undefined,
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
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 XXXXX XXXXX" />
            </div>
            <div className="space-y-1">
              <Label>Department</Label>
              <Select value={form.departmentId} onValueChange={(v) => set("departmentId", v)}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
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
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const { data, isLoading } = useListDoctors(
    { search: search || undefined },
    { query: { queryKey: getListDoctorsQueryKey({ search: search || undefined }) } }
  );

  function invalidate() { queryClient.invalidateQueries({ queryKey: getListDoctorsQueryKey() }); }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Doctors</h1>
            <p className="text-muted-foreground mt-2">Manage hospital doctors and their schedules</p>
          </div>
          <Button className="gap-2" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" /> Add Doctor
          </Button>
        </div>

        <Card>
          <CardHeader className="py-4">
            <div className="flex items-center gap-2 max-w-sm">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search doctors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading doctors...</TableCell></TableRow>
                ) : data?.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No doctors found</TableCell></TableRow>
                ) : data?.map((doctor) => (
                  <TableRow key={doctor.id}>
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
                            <Phone className="w-3 h-3" /> {doctor.phone}
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
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <AddDoctorDialog open={addOpen} onClose={() => setAddOpen(false)} onSuccess={invalidate} />
    </DashboardLayout>
  );
}
