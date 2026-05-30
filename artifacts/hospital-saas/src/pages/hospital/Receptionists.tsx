import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListReceptionists, getListReceptionistsQueryKey,
  useCreateReceptionist, useUpdateReceptionist, useDeleteReceptionist,
} from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Mail, Phone, CheckSquare, Square, X, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { addReceptionistSchema } from "@/lib/validations/receptionist";

function formatPhoneForUi(phone?: string | null) {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  return digits ? `+91-${digits}` : "";
}

function AddReceptionistDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const mutation = useCreateReceptionist();

  function handleSubmit() {
    const parsed = addReceptionistSchema.safeParse({
      name,
      email,
      password,
      phone,
    });
    if (!parsed.success) {
      toast({ variant: "destructive", title: parsed.error.issues[0]?.message ?? "Invalid input" });
      return;
    }
    const { name: cleanName, email: cleanEmail, password: cleanPassword, phone: cleanPhone } = parsed.data;
    mutation.mutate({
      data: { name: cleanName, email: cleanEmail, password: cleanPassword, phone: cleanPhone || undefined }
    }, {
      onSuccess: () => {
        toast({ title: "Receptionist account created" });
        setName("");
        setEmail("");
        setPassword("");
        setPhone("");
        setShowPwd(false);
        onSuccess();
        onClose();
      },
      onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Receptionist</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Full Name <span className="text-red-500">*</span></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Staff full name" />
          </div>
          <div className="space-y-1">
            <Label>Email <span className="text-red-500">*</span></Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="staff@hospital.com" />
          </div>
          <div className="space-y-1">
            <Label>Password <span className="text-red-500">*</span></Label>
            <div className="relative">
              <Input
                type={showPwd ? "text" : "password"}
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="pr-16"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowPwd(s => !s)}
              >{showPwd ? "Hide" : "Show"}</button>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">+91-</span>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10 digit phone"
                maxLength={10}
                inputMode="numeric"
                className="pl-12"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "Creating..." : "Create Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditReceptionistDialog({
  open, onClose, onSuccess, receptionist,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  receptionist: { id: number; name: string; email: string; isActive?: boolean } | null;
}) {
  const { toast } = useToast();
  const mutation = useUpdateReceptionist();
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open || !receptionist) return;
    setName(receptionist.name);
    setIsActive(receptionist.isActive !== false);
  }, [open, receptionist]);

  function handleSubmit() {
    if (!receptionist) return;
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Name is required" });
      return;
    }

    mutation.mutate(
      { id: receptionist.id, data: { name: name.trim(), isActive } },
      {
        onSuccess: () => {
          toast({ title: "Receptionist updated" });
          onSuccess();
          onClose();
        },
        onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Edit Receptionist</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Full Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Staff full name" />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={receptionist?.email ?? ""} disabled />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Receptionists() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<{ id: number; name: string; email: string; isActive?: boolean } | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteReceptionist = useDeleteReceptionist();

  const { data, isLoading } = useListReceptionists(
    { query: { queryKey: getListReceptionistsQueryKey() } }
  );
  const receptionists = (Array.isArray(data) ? data : []).filter((s) => {
    if (statusFilter === "ACTIVE") return s.isActive !== false;
    if (statusFilter === "INACTIVE") return s.isActive === false;
    return true;
  });

  function invalidate() { queryClient.invalidateQueries({ queryKey: getListReceptionistsQueryKey() }); }
  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? receptionists.map((s) => s.id) : []);
  }
  function toggleOne(id: number, checked: boolean) {
    setSelectedIds((prev) => checked ? [...prev, id] : prev.filter((x) => x !== id));
  }
  async function handleDeleteSelected() {
    const ids = [...selectedIds];
    const results = await Promise.allSettled(ids.map((id) => deleteReceptionist.mutateAsync({ id })));
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const fail = results.length - ok;
    if (ok) toast({ title: `Deleted ${ok} receptionist(s)` });
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
            <h1 className="text-3xl font-bold tracking-tight">Receptionists</h1>
            <p className="text-muted-foreground mt-2">Manage front desk staff and access</p>
          </div>
          <div className="flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:justify-end">
            <Button className="gap-2 px-3 w-full sm:w-auto" variant="outline" onClick={() => toggleSelectAll(selectedIds.length !== receptionists.length)}>
              {selectedIds.length === receptionists.length && receptionists.length > 0
                ? <CheckSquare className="w-4 h-4 text-purple-600" />
                : <Square className="w-4 h-4 text-slate-500" />}
              {selectedIds.length === receptionists.length && receptionists.length > 0 ? "Deselect all" : `Select all receptionists (${receptionists.length})`}
            </Button>
            <Button className="gap-2 cursor-pointer w-full sm:w-auto" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4" /> Add Receptionist
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="p-4 flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-full sm:w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(10)].map((_, i) => (
                    <TableRow key={`receptionist-skeleton-${i}`}>
                      <TableCell><Skeleton className="h-5 w-5" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-56" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-6 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : receptionists.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No receptionists found</TableCell></TableRow>
                ) : receptionists.map((staff) => (
                  <TableRow key={staff.id} className={selectedIds.includes(staff.id) ? "bg-primary/5 border-primary/30" : ""}>
                    <TableCell>
                      <button onClick={() => toggleOne(staff.id, !selectedIds.includes(staff.id))} className="flex items-center justify-center w-5 h-5 cursor-pointer">
                        {selectedIds.includes(staff.id)
                          ? <CheckSquare className="w-5 h-5 text-purple-600" />
                          : <Square className="w-5 h-5 text-slate-400 hover:text-purple-600" />}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs">
                          {staff.name.charAt(0)}
                        </div>
                        <p className="font-medium">{staff.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-3 h-3" /> {staff.email}
                        </div>
                        {staff.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="w-3 h-3" /> {formatPhoneForUi(staff.phone)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {staff.createdAt ? new Date(staff.createdAt).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell>
                      {staff.isActive !== false ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="cursor-pointer gap-1.5"
                        onClick={() => {
                          setSelected({ id: staff.id, name: staff.name, email: staff.email, isActive: staff.isActive });
                          setEditOpen(true);
                        }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </Button>
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
            <span className="text-sm font-medium">receptionists selected</span>
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
            <AlertDialogTitle>Delete selected receptionists?</AlertDialogTitle>
            <AlertDialogDescription>
              You are deleting {selectedIds.length} selected receptionist(s). This action cannot be undone.
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

      <AddReceptionistDialog open={addOpen} onClose={() => setAddOpen(false)} onSuccess={invalidate} />
      <EditReceptionistDialog open={editOpen} onClose={() => setEditOpen(false)} onSuccess={invalidate} receptionist={selected} />
    </DashboardLayout>
  );
}
