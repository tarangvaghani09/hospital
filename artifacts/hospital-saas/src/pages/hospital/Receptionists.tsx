import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListReceptionists, getListReceptionistsQueryKey,
  useCreateReceptionist, useUpdateReceptionist,
} from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Mail, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

function AddReceptionistDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const mutation = useCreateReceptionist();

  function handleSubmit() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast({ variant: "destructive", title: "Name, email and password are required" }); return;
    }
    if (password.length < 6) {
      toast({ variant: "destructive", title: "Password must be at least 6 characters" }); return;
    }
    mutation.mutate({
      data: { name, email, password, phone: phone || undefined }
    }, {
      onSuccess: () => { toast({ title: "Receptionist account created" }); onSuccess(); onClose(); },
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
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" />
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
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<{ id: number; name: string; email: string; isActive?: boolean } | null>(null);

  const { data, isLoading } = useListReceptionists(
    { query: { queryKey: getListReceptionistsQueryKey() } }
  );
  const receptionists = Array.isArray(data) ? data : [];

  function invalidate() { queryClient.invalidateQueries({ queryKey: getListReceptionistsQueryKey() }); }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Receptionists</h1>
            <p className="text-muted-foreground mt-2">Manage front desk staff and access</p>
          </div>
          <Button className="gap-2" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" /> Add Receptionist
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading receptionists...</TableCell></TableRow>
                ) : receptionists.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No receptionists found</TableCell></TableRow>
                ) : receptionists.map((staff) => (
                  <TableRow key={staff.id}>
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
                            <Phone className="w-3 h-3" /> {staff.phone}
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
                        onClick={() => {
                          setSelected({ id: staff.id, name: staff.name, email: staff.email, isActive: staff.isActive });
                          setEditOpen(true);
                        }}
                      >
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

      <AddReceptionistDialog open={addOpen} onClose={() => setAddOpen(false)} onSuccess={invalidate} />
      <EditReceptionistDialog open={editOpen} onClose={() => setEditOpen(false)} onSuccess={invalidate} receptionist={selected} />
    </DashboardLayout>
  );
}
