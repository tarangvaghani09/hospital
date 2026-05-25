import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useListHospitals, getListHospitalsQueryKey, useRegisterHospital } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Building2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const addHospitalSchema = z.object({
  hospitalName: z.string().min(2, "Hospital name is required"),
  adminName: z.string().min(2, "Admin name is required"),
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "Minimum 8 characters"),
  phone: z.string().min(10, "Valid phone required"),
  address: z.string().optional(),
});

function AddHospitalDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const registerMutation = useRegisterHospital();

  const form = useForm<z.infer<typeof addHospitalSchema>>({
    resolver: zodResolver(addHospitalSchema),
    defaultValues: { hospitalName: "", adminName: "", email: "", password: "", phone: "", address: "" },
  });

  function onSubmit(values: z.infer<typeof addHospitalSchema>) {
    registerMutation.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "Hospital added", description: `${values.hospitalName} has been registered successfully.` });
        queryClient.invalidateQueries({ queryKey: getListHospitalsQueryKey() });
        form.reset();
        onClose();
      },
      onError: (error: any) => {
        toast({ variant: "destructive", title: "Failed to add hospital", description: error.message || "Please check the details and try again." });
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Add New Hospital
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="hospitalName"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Hospital Name</FormLabel>
                    <FormControl><Input placeholder="e.g. Sunrise Medical Centre" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="adminName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin Name</FormLabel>
                    <FormControl><Input placeholder="Full name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl><Input placeholder="+91 XXXXX XXXXX" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin Email</FormLabel>
                    <FormControl><Input type="email" placeholder="admin@hospital.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Password</FormLabel>
                    <FormControl><Input type="password" placeholder="Min 8 characters" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="address"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Address <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                    <FormControl><Input placeholder="Street, City, State" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={registerMutation.isPending} className="gap-2">
                <Plus className="w-4 h-4" />
                {registerMutation.isPending ? "Adding..." : "Add Hospital"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function SuperAdminHospitals() {
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const { data, isLoading } = useListHospitals(
    { search: search || undefined, page: 1, limit: 50 },
    { query: { queryKey: getListHospitalsQueryKey({ search: search || undefined, page: 1, limit: 50 }) } }
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Hospitals</h1>
            <p className="text-muted-foreground mt-2">Manage all registered hospital tenants</p>
          </div>
          <Button className="gap-2" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" /> Add Hospital
          </Button>
        </div>

        <Card>
          <CardHeader className="py-4">
            <div className="flex items-center gap-2 max-w-sm">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search hospitals..."
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
                  <TableHead>Hospital</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading hospitals...</TableCell>
                  </TableRow>
                ) : data?.hospitals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No hospitals found</TableCell>
                  </TableRow>
                ) : data?.hospitals.map((hospital) => (
                  <TableRow key={hospital.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium">{hospital.name}</p>
                          <p className="text-xs text-muted-foreground">{hospital.email || "No email"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">{hospital.code}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{hospital.subscriptionPlan || "N/A"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        hospital.status === 'ACTIVE' ? 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400' :
                        hospital.status === 'PENDING' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400'
                      }>
                        {hospital.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/super-admin/hospitals/${hospital.id}`}>
                        <Button variant="ghost" size="sm">Manage</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <AddHospitalDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </DashboardLayout>
  );
}
