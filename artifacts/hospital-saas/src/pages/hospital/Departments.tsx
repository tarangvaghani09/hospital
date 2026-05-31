import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListDepartments, getListDepartmentsQueryKey,
  useCreateDepartment, useUpdateDepartment, useDeleteDepartment,
} from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Users, Pencil, CheckSquare, Square, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { makeDepartmentSchema } from "@/lib/validations/department";

function DeptDialog({
  open, onClose, onSuccess,
  initial,
  existingNames,
}: {
  open: boolean; onClose: () => void; onSuccess: () => void;
  initial?: { id: number; name: string; description?: string | null; isActive?: boolean };
  existingNames: string[];
}) {
  const { toast } = useToast();
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive !== false);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setDescription(initial?.description ?? "");
    setIsActive(initial?.isActive !== false);
  }, [open, initial]);

  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();

  function handleSubmit() {
    const schema = makeDepartmentSchema(existingNames, initial?.name);
    const parsed = schema.safeParse({ name, description });
    if (!parsed.success) {
      toast({ variant: "destructive", title: parsed.error.issues[0]?.message ?? "Invalid input" });
      return;
    }
    const clean = parsed.data;

    if (isEdit) {
      updateMutation.mutate(
        { id: initial!.id, data: { name: clean.name, description: clean.description || undefined, isActive } },
        {
          onSuccess: () => { toast({ title: "Department updated" }); onSuccess(); onClose(); },
          onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
        }
      );
    } else {
      createMutation.mutate(
        { data: { name: clean.name, description: clean.description || undefined } },
        {
          onSuccess: () => {
            toast({ title: "Department created" });
            setName("");
            setDescription("");
            setIsActive(true);
            onSuccess();
            onClose();
          },
          onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
        }
      );
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Department" : "Add Department"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Name <span className="text-red-500">*</span></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cardiology" />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Brief description..." />
          </div>
          {isEdit && (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">Deactivate to hide from new bookings</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? (isEdit ? "Saving..." : "Creating...") : (isEdit ? "Save Changes" : "Create Department")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Departments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteDepartment = useDeleteDepartment();

  const { data, isLoading } = useListDepartments(
    { query: { queryKey: getListDepartmentsQueryKey() } }
  );
  const departments = (data ?? []).filter((d: any) => {
    if (statusFilter === "ACTIVE") return d.isActive !== false;
    if (statusFilter === "INACTIVE") return d.isActive === false;
    return true;
  });

  function invalidate() { queryClient.invalidateQueries({ queryKey: getListDepartmentsQueryKey() }); }
  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? departments.map((d: any) => d.id) : []);
  }
  function toggleOne(id: number, checked: boolean) {
    setSelectedIds((prev) => checked ? [...prev, id] : prev.filter((x) => x !== id));
  }
  async function handleDeleteSelected() {
    const ids = [...selectedIds];
    const results = await Promise.allSettled(ids.map((id) => deleteDepartment.mutateAsync({ id })));
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const fail = results.length - ok;
    if (ok) toast({ title: `Deleted ${ok} department(s)` });
    if (fail) toast({ variant: "destructive", title: `${fail} deletion(s) failed` });
    setSelectedIds([]);
    setDeleteOpen(false);
    invalidate();
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-6 sm:pb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Departments</h1>
            <p className="text-muted-foreground mt-2">Manage hospital departments and categories</p>
          </div>
          <div className="flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:justify-end">
            <Button className="gap-2 px-3 w-full sm:w-auto" variant="outline" onClick={() => toggleSelectAll(selectedIds.length !== departments.length)}>
              {selectedIds.length === departments.length && departments.length > 0
                ? <CheckSquare className="w-4 h-4 text-purple-600" />
                : <Square className="w-4 h-4 text-slate-500" />}
              {selectedIds.length === departments.length && departments.length > 0 ? "Deselect all" : `Select all departments (${departments.length})`}
            </Button>
            <Button className="gap-2 cursor-pointer w-full sm:w-auto" onClick={() => { setEditing(null); setDialogOpen(true); }}>
              <Plus className="w-4 h-4" /> Add Department
            </Button>
          </div>
        </div>

        <Card>
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
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[760px] sm:min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Department Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Doctors</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(10)].map((_, i) => (
                    <TableRow key={`department-skeleton-${i}`}>
                      <TableCell><Skeleton className="h-5 w-5" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-44" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-56" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-14" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-6 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : departments.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No departments found</TableCell></TableRow>
                ) : departments.map((dept) => (
                  <TableRow key={dept.id} className={selectedIds.includes(dept.id) ? "bg-primary/5 border-primary/30" : ""}>
                    <TableCell>
                      <button onClick={() => toggleOne(dept.id, !selectedIds.includes(dept.id))} className="flex items-center justify-center w-5 h-5 cursor-pointer">
                        {selectedIds.includes(dept.id)
                          ? <CheckSquare className="w-5 h-5 text-purple-600" />
                          : <Square className="w-5 h-5 text-slate-400 hover:text-purple-600" />}
                      </button>
                    </TableCell>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell className="text-muted-foreground">{dept.description || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>{dept.doctorCount || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {dept.isActive !== false ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="gap-1.5 cursor-pointer"
                        onClick={() => { setEditing(dept); setDialogOpen(true); }}>
                        <Pencil className="w-3.5 h-3.5" /> Edit
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
            <span className="text-sm font-medium">departments selected</span>
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
            <AlertDialogTitle>Delete selected departments?</AlertDialogTitle>
            <AlertDialogDescription>
              You are deleting {selectedIds.length} selected department(s). This action cannot be undone.
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

      <DeptDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        onSuccess={invalidate}
        initial={editing ?? undefined}
        existingNames={(data ?? []).map((d: any) => d.name)}
      />
    </DashboardLayout>
  );
}
