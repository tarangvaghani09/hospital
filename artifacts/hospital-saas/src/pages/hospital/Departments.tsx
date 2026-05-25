import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListDepartments, getListDepartmentsQueryKey,
  useCreateDepartment, useUpdateDepartment,
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
import { Plus, Users, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

function DeptDialog({
  open, onClose, onSuccess,
  initial,
}: {
  open: boolean; onClose: () => void; onSuccess: () => void;
  initial?: { id: number; name: string; description?: string | null; isActive?: boolean };
}) {
  const { toast } = useToast();
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive !== false);

  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();

  function handleSubmit() {
    if (!name.trim()) { toast({ variant: "destructive", title: "Name is required" }); return; }
    if (isEdit) {
      updateMutation.mutate(
        { id: initial!.id, data: { name, description: description || undefined, isActive } },
        {
          onSuccess: () => { toast({ title: "Department updated" }); onSuccess(); onClose(); },
          onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
        }
      );
    } else {
      createMutation.mutate(
        { data: { name, description: description || undefined } },
        {
          onSuccess: () => { toast({ title: "Department created" }); onSuccess(); onClose(); },
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
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data, isLoading } = useListDepartments(
    { query: { queryKey: getListDepartmentsQueryKey() } }
  );

  function invalidate() { queryClient.invalidateQueries({ queryKey: getListDepartmentsQueryKey() }); }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Departments</h1>
            <p className="text-muted-foreground mt-2">Manage hospital departments and categories</p>
          </div>
          <Button className="gap-2" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="w-4 h-4" /> Add Department
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Doctors</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading departments...</TableCell></TableRow>
                ) : data?.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No departments found</TableCell></TableRow>
                ) : data?.map((dept) => (
                  <TableRow key={dept.id}>
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
                      <Button variant="ghost" size="sm" className="gap-1.5"
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

      <DeptDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        onSuccess={invalidate}
        initial={editing ?? undefined}
      />
    </DashboardLayout>
  );
}
