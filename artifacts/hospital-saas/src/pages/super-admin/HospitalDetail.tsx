import { useGetHospital, getGetHospitalQueryKey, useListSubscriptionPlans } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Mail, Phone, MapPin, CheckCircle, XCircle, Plus, Stethoscope, CreditCard, RefreshCw, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { getApiUrl } from "@/lib/utils";
import { formatMoney } from "@/lib/currency";

interface StaffData {
  doctors: any[];
  receptionists: any[];
  departments: any[];
}

function useHospitalStaff(hospitalId: number) {
  const [data, setData] = useState<StaffData | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!hospitalId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("medicore_token");
      const res = await fetch(`${getApiUrl()}admin/hospitals/${hospitalId}/staff`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [hospitalId]);
  return { data, loading, reload: load };
}

const emptyDoctor = { name: "", email: "", password: "", phone: "", specialization: "", qualification: "", experience: "", consultationFee: "", departmentId: "" };
const emptyReceptionist = { name: "", email: "", password: "", phone: "" };

export function SuperAdminHospitalDetail() {
  const params = useParams();
  const hospitalId = params.id ? parseInt(params.id) : 0;
  const { toast } = useToast();

  const { data: hospital, isLoading } = useGetHospital(
    hospitalId,
    { query: { enabled: !!hospitalId, queryKey: getGetHospitalQueryKey(hospitalId) } }
  );

  const { data: staffData, loading: staffLoading, reload: reloadStaff } = useHospitalStaff(hospitalId);

  const queryClient = useQueryClient();

  const [doctorDialog, setDoctorDialog] = useState(false);
  const [receptionistDialog, setReceptionistDialog] = useState(false);
  const [doctorForm, setDoctorForm] = useState(emptyDoctor);
  const [receptionistForm, setReceptionistForm] = useState(emptyReceptionist);
  const [saving, setSaving] = useState(false);

  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedCycle, setSelectedCycle] = useState("MONTHLY");
  const [assigningPlan, setAssigningPlan] = useState(false);
  const { data: plansData } = useListSubscriptionPlans({});

  async function postStaff(endpoint: string, payload: any) {
    const token = localStorage.getItem("medicore_token");
    const res = await fetch(`${getApiUrl()}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(err.error || "Failed");
    }
    return res.json();
  }

  async function handleAssignPlan() {
    if (!selectedPlanId) { toast({ variant: "destructive", title: "Please select a plan" }); return; }
    setAssigningPlan(true);
    try {
      const token = localStorage.getItem("medicore_token");
      const res = await fetch(`${getApiUrl()}admin/hospitals/${hospitalId}/subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planId: parseInt(selectedPlanId), billingCycle: selectedCycle }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Failed to assign plan");
      }
      toast({ title: "Plan assigned successfully" });
      queryClient.invalidateQueries({ queryKey: getGetHospitalQueryKey(hospitalId) });
      setSelectedPlanId("");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed", description: e.message });
    } finally {
      setAssigningPlan(false);
    }
  }

  async function handleAddDoctor() {
    if (!doctorForm.name || !doctorForm.email || !doctorForm.password) {
      toast({ variant: "destructive", title: "Name, email, and password are required" }); return;
    }
    setSaving(true);
    try {
      await postStaff(`admin/hospitals/${hospitalId}/doctors`, {
        ...doctorForm,
        experience: doctorForm.experience ? parseInt(doctorForm.experience) : null,
        consultationFee: doctorForm.consultationFee ? parseFloat(doctorForm.consultationFee) : null,
        departmentId: doctorForm.departmentId ? parseInt(doctorForm.departmentId) : null,
      });
      toast({ title: "Doctor added successfully" });
      setDoctorDialog(false);
      setDoctorForm(emptyDoctor);
      reloadStaff();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed", description: e.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleAddReceptionist() {
    if (!receptionistForm.name || !receptionistForm.email || !receptionistForm.password) {
      toast({ variant: "destructive", title: "Name, email, and password are required" }); return;
    }
    setSaving(true);
    try {
      await postStaff(`admin/hospitals/${hospitalId}/receptionists`, receptionistForm);
      toast({ title: "Receptionist added successfully" });
      setReceptionistDialog(false);
      setReceptionistForm(emptyReceptionist);
      reloadStaff();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed", description: e.message });
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-1/4" />
          <Skeleton className="h-[400px]" />
        </div>
      </DashboardLayout>
    );
  }

  if (!hospital) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold">Hospital not found</h2>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">{hospital.name}</h1>
                <Badge className={
                  hospital.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                  hospital.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                }>{hospital.status}</Badge>
              </div>
              <p className="text-muted-foreground mt-1">Hospital Code: {hospital.code}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {hospital.status !== 'ACTIVE' && (
              <Button variant="outline" className="text-green-600 border-green-200 bg-green-50 hover:bg-green-100">
                <CheckCircle className="w-4 h-4 mr-2" /> Approve & Activate
              </Button>
            )}
            {hospital.status !== 'INACTIVE' && (
              <Button variant="outline" className="text-red-600 border-red-200 bg-red-50 hover:bg-red-100">
                <XCircle className="w-4 h-4 mr-2" /> Deactivate
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Hospital Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Registration Number</h4>
                      <p>{hospital.registrationNumber || "Not provided"}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">GST Number</h4>
                      <p>{hospital.gstNumber || "Not provided"}</p>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="flex gap-3">
                      <Mail className="w-5 h-5 text-muted-foreground shrink-0" />
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Email</h4>
                        <p>{hospital.email || "Not provided"}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Phone className="w-5 h-5 text-muted-foreground shrink-0" />
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Phone</h4>
                        <p>{hospital.phone || "Not provided"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <MapPin className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Address</h4>
                      <p>{hospital.address || "Not provided"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Usage Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Total Doctors</span>
                    <span className="font-bold text-xl">{hospital.totalDoctors || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Total Patients</span>
                    <span className="font-bold text-xl">{hospital.totalPatients || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Joined On</span>
                    <span className="font-medium">{new Date(hospital.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ─── Staff Tab ─── */}
          <TabsContent value="staff" className="mt-6 space-y-6">
            {/* Doctors */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Stethoscope className="w-5 h-5" /> Doctors</CardTitle>
                    <CardDescription>Manage doctors assigned to this hospital</CardDescription>
                  </div>
                  <Button size="sm" className="gap-1" onClick={() => setDoctorDialog(true)}>
                    <Plus className="w-4 h-4" /> Add Doctor
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {staffLoading ? (
                  <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
                ) : !staffData?.doctors?.length ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">No doctors added yet.</p>
                ) : (
                  <div className="divide-y">
                    {staffData.doctors.map((d: any) => (
                      <div key={d.id} className="py-3 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium">{d.name}</p>
                          <p className="text-sm text-muted-foreground">{d.email} {d.specialization ? `· ${d.specialization}` : ""}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {d.departmentName && <Badge variant="outline">{d.departmentName}</Badge>}
                          <Badge className={d.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
                            {d.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Receptionists */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><UserCheck className="w-5 h-5" /> Receptionists</CardTitle>
                    <CardDescription>Manage receptionists assigned to this hospital</CardDescription>
                  </div>
                  <Button size="sm" className="gap-1" onClick={() => setReceptionistDialog(true)}>
                    <Plus className="w-4 h-4" /> Add Receptionist
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {staffLoading ? (
                  <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-12" />)}</div>
                ) : !staffData?.receptionists?.length ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">No receptionists added yet.</p>
                ) : (
                  <div className="divide-y">
                    {staffData.receptionists.map((r: any) => (
                      <div key={r.id} className="py-3 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium">{r.name}</p>
                          <p className="text-sm text-muted-foreground">{r.email}</p>
                        </div>
                        <Badge className={r.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
                          {r.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscription" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Subscription</CardTitle>
                <CardDescription>Billing and plan details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Current plan status */}
                <div className="flex flex-wrap gap-6 p-4 bg-muted/30 rounded-xl border">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Active Plan</p>
                    <p className="text-2xl font-bold">{hospital.subscriptionPlan || "Free Tier"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <Badge className={
                      hospital.subscriptionStatus === "ACTIVE" ? "bg-green-100 text-green-800" :
                      hospital.subscriptionStatus === "EXPIRED" ? "bg-red-100 text-red-800" :
                      "bg-muted text-muted-foreground"
                    }>{hospital.subscriptionStatus || "None"}</Badge>
                  </div>
                  {hospital.subscriptionExpiry && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Expires</p>
                      <p className="font-medium">{new Date(hospital.subscriptionExpiry).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>

                {/* Assign / change plan */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <h4 className="font-semibold">Assign / Change Plan</h4>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3 items-end">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs text-muted-foreground">Select Plan</Label>
                      <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a subscription plan…" />
                        </SelectTrigger>
                        <SelectContent>
                          {((plansData as any) ?? []).map((plan: any) => (
                            <SelectItem key={plan.id} value={String(plan.id)}>
                              <span className="flex items-center justify-between gap-4 w-full">
                                <span className="font-medium">{plan.name}</span>
                                <span className="text-muted-foreground text-xs">{formatMoney(plan.price)}/{plan.billingCycle === "YEARLY" ? "yr" : "mo"}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Billing Cycle</Label>
                      <Select value={selectedCycle} onValueChange={setSelectedCycle}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MONTHLY">Monthly</SelectItem>
                          <SelectItem value="YEARLY">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Plan preview cards */}
                  {((plansData as any) ?? []).length > 0 && (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {((plansData as any) ?? []).map((plan: any) => (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setSelectedPlanId(String(plan.id))}
                          className={`text-left rounded-xl border-2 p-4 transition-all hover:shadow-sm ${selectedPlanId === String(plan.id) ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <p className="font-semibold">{plan.name}</p>
                            {selectedPlanId === String(plan.id) && <CheckCircle className="w-4 h-4 text-primary shrink-0" />}
                          </div>
                          <p className="text-xl font-bold">{formatMoney(plan.price)}<span className="text-sm font-normal text-muted-foreground">/{plan.billingCycle === "YEARLY" ? "yr" : "mo"}</span></p>
                          {plan.maxDoctors && <p className="text-xs text-muted-foreground mt-1">Up to {plan.maxDoctors} doctors</p>}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button onClick={handleAssignPlan} disabled={assigningPlan || !selectedPlanId} className="gap-2">
                      {assigningPlan ? <><RefreshCw className="w-4 h-4 animate-spin" /> Assigning…</> : <><CreditCard className="w-4 h-4" /> Assign Plan</>}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Admin Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Administrative controls for this tenant.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Doctor Dialog */}
      <Dialog open={doctorDialog} onOpenChange={setDoctorDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Doctor to {hospital.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Full Name *</Label>
                <Input value={doctorForm.name} onChange={e => setDoctorForm(f => ({ ...f, name: e.target.value }))} placeholder="Dr. John Smith" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" value={doctorForm.email} onChange={e => setDoctorForm(f => ({ ...f, email: e.target.value }))} placeholder="doctor@hospital.com" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Password *</Label>
                <Input type="password" value={doctorForm.password} onChange={e => setDoctorForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={doctorForm.phone} onChange={e => setDoctorForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 9876543210" />
              </div>
              <div className="space-y-1.5">
                <Label>Specialization</Label>
                <Input value={doctorForm.specialization} onChange={e => setDoctorForm(f => ({ ...f, specialization: e.target.value }))} placeholder="Cardiology" />
              </div>
              <div className="space-y-1.5">
                <Label>Qualification</Label>
                <Input value={doctorForm.qualification} onChange={e => setDoctorForm(f => ({ ...f, qualification: e.target.value }))} placeholder="MD, DM" />
              </div>
              <div className="space-y-1.5">
                <Label>Experience (years)</Label>
                <Input type="number" value={doctorForm.experience} onChange={e => setDoctorForm(f => ({ ...f, experience: e.target.value }))} placeholder="5" />
              </div>
              <div className="space-y-1.5">
                <Label>Consultation Fee</Label>
                <Input type="number" value={doctorForm.consultationFee} onChange={e => setDoctorForm(f => ({ ...f, consultationFee: e.target.value }))} placeholder="500" />
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select value={doctorForm.departmentId} onValueChange={v => setDoctorForm(f => ({ ...f, departmentId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select dept." /></SelectTrigger>
                  <SelectContent>
                    {staffData?.departments?.map((d: any) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDoctorDialog(false)}>Cancel</Button>
            <Button onClick={handleAddDoctor} disabled={saving}>{saving ? "Adding..." : "Add Doctor"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Receptionist Dialog */}
      <Dialog open={receptionistDialog} onOpenChange={setReceptionistDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Receptionist to {hospital.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input value={receptionistForm.name} onChange={e => setReceptionistForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Doe" />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" value={receptionistForm.email} onChange={e => setReceptionistForm(f => ({ ...f, email: e.target.value }))} placeholder="reception@hospital.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Password *</Label>
              <Input type="password" value={receptionistForm.password} onChange={e => setReceptionistForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={receptionistForm.phone} onChange={e => setReceptionistForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 9876543210" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceptionistDialog(false)}>Cancel</Button>
            <Button onClick={handleAddReceptionist} disabled={saving}>{saving ? "Adding..." : "Add Receptionist"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
