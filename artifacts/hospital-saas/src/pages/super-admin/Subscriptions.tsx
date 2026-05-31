import { useListSubscriptionPlans, getListSubscriptionPlansQueryKey } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Plus, CheckCircle2, Pencil, Tag } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { getApiUrl } from "@/lib/utils";

interface PlanForm {
  name: string;
  description: string;
  originalPrice: string;
  price: string;
  billingCycle: string;
  maxDoctors: string;
  maxReceptionists: string;
  maxPatients: string;
  features: string;
  isActive: boolean;
}

const empty: PlanForm = {
  name: "", description: "", originalPrice: "", price: "",
  billingCycle: "MONTHLY", maxDoctors: "", maxReceptionists: "", maxPatients: "",
  features: "", isActive: true,
};

function calcDiscount(original: string, current: string): number | null {
  const o = parseFloat(original);
  const c = parseFloat(current);
  if (!o || !c || o <= c) return null;
  return Math.round(((o - c) / o) * 100);
}

export function SuperAdminSubscriptions() {
  const { data: plans, isLoading } = useListSubscriptionPlans(
    { query: { queryKey: getListSubscriptionPlansQueryKey() } }
  );
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PlanForm>(empty);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditingId(null);
    setForm(empty);
    setOpen(true);
  }

  function openEdit(plan: any) {
    setEditingId(plan.id);
    setForm({
      name: plan.name || "",
      description: plan.description || "",
      originalPrice: plan.originalPrice != null ? String(plan.originalPrice) : "",
      price: String(plan.price || ""),
      billingCycle: plan.billingCycle || "MONTHLY",
      maxDoctors: plan.maxDoctors != null ? String(plan.maxDoctors) : "",
      maxReceptionists: plan.maxReceptionists != null ? String(plan.maxReceptionists) : "",
      maxPatients: plan.maxPatients != null ? String(plan.maxPatients) : "",
      features: (plan.features || []).join("\n"),
      isActive: plan.isActive !== false,
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.name || !form.price) {
      toast({ variant: "destructive", title: "Name and current price are required" });
      return;
    }
    setSaving(true);
    const token = localStorage.getItem("medicore_token");
    const payload = {
      name: form.name,
      description: form.description || null,
      originalPrice: form.originalPrice ? parseFloat(form.originalPrice) : null,
      price: parseFloat(form.price),
      billingCycle: form.billingCycle,
      maxDoctors: form.maxDoctors ? parseInt(form.maxDoctors) : null,
      maxReceptionists: form.maxReceptionists ? parseInt(form.maxReceptionists) : null,
      maxPatients: form.maxPatients ? parseInt(form.maxPatients) : null,
      features: form.features ? form.features.split("\n").map(s => s.trim()).filter(Boolean) : [],
      isActive: form.isActive,
    };
    try {
      const url = editingId
        ? `${getApiUrl()}subscription-plans/${editingId}`
        : `${getApiUrl()}subscription-plans`;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: editingId ? "Plan updated" : "Plan created" });
      queryClient.invalidateQueries({ queryKey: getListSubscriptionPlansQueryKey() });
      setOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed", description: e.message });
    } finally {
      setSaving(false);
    }
  }

  const discount = calcDiscount(form.originalPrice, form.price);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Subscription Plans</h1>
            <p className="text-muted-foreground mt-2">Manage billing tiers and feature access</p>
          </div>
          <Button className="gap-2 w-full sm:w-auto" onClick={openCreate}>
            <Plus className="w-4 h-4" /> Create Plan
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-[400px] w-full" />)}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3 items-stretch">
            {plans?.map((plan: any) => {
              const hasDiscount = plan.originalPrice != null && Number(plan.originalPrice) > Number(plan.price);
              const discountPct = hasDiscount ? Math.round(((Number(plan.originalPrice) - Number(plan.price)) / Number(plan.originalPrice)) * 100) : null;
              return (
                <Card key={plan.id} className={`flex flex-col ${plan.isActive === false ? 'opacity-60' : ''}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-2xl">{plan.name}</CardTitle>
                        <CardDescription>{plan.description || "No description provided."}</CardDescription>
                      </div>
                      {discountPct && (
                        <span className="shrink-0 bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                          <Tag className="w-3 h-3" />{discountPct}% OFF
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-6">
                    <div className="space-y-1">
                      {hasDiscount && (
                        <div className="text-muted-foreground line-through text-lg">
                          ₹{Number(plan.originalPrice).toLocaleString()}
                        </div>
                      )}
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-primary">₹{Number(plan.price).toLocaleString()}</span>
                        <span className="text-muted-foreground">/{plan.billingCycle.toLowerCase()}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm border-b pb-2">
                        <span className="text-muted-foreground">Max Doctors</span>
                        <span className="font-medium">{plan.maxDoctors ?? "Unlimited"}</span>
                      </div>
                      <div className="flex justify-between text-sm border-b pb-2">
                        <span className="text-muted-foreground">Max Receptionists</span>
                        <span className="font-medium">{plan.maxReceptionists ?? "Unlimited"}</span>
                      </div>
                      <div className="flex justify-between text-sm border-b pb-2">
                        <span className="text-muted-foreground">Max Patients</span>
                        <span className="font-medium">{plan.maxPatients ?? "Unlimited"}</span>
                      </div>
                    </div>

                    {plan.features && plan.features.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <p className="text-sm font-medium mb-2">Features</p>
                        {plan.features.map((feature: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full gap-2" onClick={() => openEdit(plan)}>
                      <Pencil className="w-4 h-4" /> Edit Plan
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Plan" : "Create Plan"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Plan Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Professional" />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label>Description</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description" />
              </div>

              <div className="space-y-1.5">
                <Label>Original Price (MRP)</Label>
                <Input type="number" value={form.originalPrice} onChange={e => setForm(f => ({ ...f, originalPrice: e.target.value }))} placeholder="e.g. 999" />
                <p className="text-[11px] text-muted-foreground">Shown crossed-out as MRP</p>
              </div>

              <div className="space-y-1.5">
                <Label>Offer Price (Current) *</Label>
                <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="e.g. 799" />
                {discount && (
                  <p className="text-[11px] text-green-600 font-medium">{discount}% discount applied</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Billing Cycle</Label>
                <Select value={form.billingCycle} onValueChange={v => setForm(f => ({ ...f, billingCycle: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Max Doctors</Label>
                <Input type="number" value={form.maxDoctors} onChange={e => setForm(f => ({ ...f, maxDoctors: e.target.value }))} placeholder="Blank = Unlimited" />
              </div>

              <div className="space-y-1.5">
                <Label>Max Receptionists</Label>
                <Input type="number" value={form.maxReceptionists} onChange={e => setForm(f => ({ ...f, maxReceptionists: e.target.value }))} placeholder="Blank = Unlimited" />
              </div>

              <div className="space-y-1.5">
                <Label>Max Patients</Label>
                <Input type="number" value={form.maxPatients} onChange={e => setForm(f => ({ ...f, maxPatients: e.target.value }))} placeholder="Blank = Unlimited" />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label>Features (one per line)</Label>
                <Textarea
                  rows={4}
                  value={form.features}
                  onChange={e => setForm(f => ({ ...f, features: e.target.value }))}
                  placeholder={"Up to 5 Doctors\nBasic Reports\nEmail Support"}
                />
              </div>

              <div className="col-span-2 flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-xs text-muted-foreground">Inactive plans are hidden from hospitals</p>
                </div>
                <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editingId ? "Update Plan" : "Create Plan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
