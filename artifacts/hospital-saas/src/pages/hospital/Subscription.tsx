import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetHospitalSubscription, getGetHospitalSubscriptionQueryKey,
  useListSubscriptionPlans, getListSubscriptionPlansQueryKey,
  useUpgradeSubscription,
} from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Zap, Star, Tag, Users, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/lib/currency";

function UpgradeDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const { symbol } = useCurrency();
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CARD");

  const { data: plans, isLoading } = useListSubscriptionPlans({
    query: { queryKey: getListSubscriptionPlansQueryKey() }
  });

  const upgradeMutation = useUpgradeSubscription();

  function handleUpgrade() {
    if (!selectedPlanId) { toast({ variant: "destructive", title: "Please select a plan" }); return; }
    upgradeMutation.mutate(
      { data: { planId: parseInt(selectedPlanId), paymentMethod } },
      {
        onSuccess: () => { toast({ title: "Subscription upgraded", description: "Your plan has been updated." }); onSuccess(); onClose(); },
        onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
      }
    );
  }

  const selectedPlan = (plans as any[])?.find((p: any) => String(p.id) === selectedPlanId);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" /> Choose Your Plan
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : (
          <div className="space-y-5 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              {(plans as any[])?.map((plan: any) => {
                const hasDiscount = plan.originalPrice != null && Number(plan.originalPrice) > Number(plan.price);
                const discountPct = hasDiscount
                  ? Math.round(((Number(plan.originalPrice) - Number(plan.price)) / Number(plan.originalPrice)) * 100)
                  : null;
                const isSelected = String(plan.id) === selectedPlanId;

                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanId(String(plan.id))}
                    className={`w-full text-left rounded-2xl border-2 p-5 transition-all relative overflow-hidden ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                        : "border-border hover:border-primary/40 hover:shadow-md"
                    }`}
                  >
                    {discountPct && (
                      <div className="absolute top-3 right-3">
                        <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                          <Tag className="w-3 h-3" />{discountPct}% OFF
                        </span>
                      </div>
                    )}
                    {plan.isPopular && !discountPct && (
                      <div className="absolute top-3 right-3">
                        <Badge className="text-xs">Popular</Badge>
                      </div>
                    )}

                    <div className="mb-3">
                      <div className="font-bold text-lg">{plan.name}</div>
                      {plan.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
                      )}
                    </div>

                    <div className="mb-3">
                      {hasDiscount && (
                        <div className="text-muted-foreground line-through text-sm">
                          {symbol}{Number(plan.originalPrice).toLocaleString()}
                        </div>
                      )}
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-primary">{symbol}{Number(plan.price).toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground">/{plan.billingCycle?.toLowerCase() || "month"}</span>
                      </div>
                    </div>

                    <div className="space-y-1 mb-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        Up to {plan.maxDoctors ?? "∞"} doctors · {plan.maxPatients ?? "∞"} patients
                      </div>
                    </div>

                    {plan.features?.slice(0, 3).map((f: string, i: number) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs mt-1 text-muted-foreground">
                        <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" /> {f}
                      </div>
                    ))}

                    {isSelected && (
                      <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary">
                        <Star className="w-3.5 h-3.5" /> Selected
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedPlan && (
              <div className="space-y-2 pt-2 border-t">
                <Label className="font-semibold">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CARD">Credit / Debit Card</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleUpgrade} disabled={!selectedPlanId || upgradeMutation.isPending} className="gap-2">
            <Zap className="w-4 h-4" />
            {upgradeMutation.isPending ? "Upgrading..." : `Upgrade${selectedPlan ? ` to ${selectedPlan.name}` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function HospitalSubscription() {
  const queryClient = useQueryClient();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const { symbol, format: fmt } = useCurrency();

  const { data: sub, isLoading } = useGetHospitalSubscription(
    { query: { queryKey: getGetHospitalSubscriptionQueryKey() } }
  );

  function invalidate() { queryClient.invalidateQueries({ queryKey: getGetHospitalSubscriptionQueryKey() }); }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto pb-6 sm:pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscription Plan</h1>
          <p className="text-muted-foreground mt-2">Manage your current plan, usage, and billing</p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-[250px] w-full" />
            <Skeleton className="h-[300px] w-full" />
          </div>
        ) : sub ? (
          <>
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="w-5 h-5 text-primary" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-primary/70">Active Plan</span>
                    </div>
                    <CardTitle className="text-3xl text-primary">{sub.planName}</CardTitle>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-extrabold">{symbol}{sub.price || 0}</div>
                    <div className="text-sm text-muted-foreground">per {sub.billingCycle?.toLowerCase() || "month"}</div>
                    <div className="mt-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle2 className="w-3 h-3" /> {sub.status}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex-1 space-y-3">
                    <p className="text-sm font-semibold">Included Features</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {sub.features?.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex-shrink-0 space-y-3 text-sm min-w-[180px]">
                    <div className="p-3 bg-background/60 rounded-lg border">
                      <span className="text-muted-foreground block text-xs mb-0.5">Started On</span>
                      <span className="font-semibold">{new Date(sub.startDate).toLocaleDateString()}</span>
                    </div>
                    {sub.endDate && (
                      <div className="p-3 bg-background/60 rounded-lg border">
                        <span className="text-muted-foreground block text-xs mb-0.5">Renews On</span>
                        <span className="font-semibold">{new Date(sub.endDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-primary/10 pt-5">
                <Button className="gap-2" onClick={() => setUpgradeOpen(true)}>
                  <Zap className="w-4 h-4" /> Upgrade Plan
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Usage & Quotas</CardTitle>
                <CardDescription>Your resource usage based on the current plan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Doctors</span>
                    <span className="text-muted-foreground">{sub.currentDoctors || 0} / {sub.maxDoctors || "Unlimited"}</span>
                  </div>
                  <Progress value={sub.maxDoctors ? ((sub.currentDoctors || 0) / sub.maxDoctors) * 100 : 30} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Receptionists</span>
                    <span className="text-muted-foreground">{sub.currentReceptionists || 0} / {sub.maxReceptionists || "Unlimited"}</span>
                  </div>
                  <Progress value={sub.maxReceptionists ? ((sub.currentReceptionists || 0) / sub.maxReceptionists) * 100 : 20} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Patients</span>
                    <span className="text-muted-foreground">{sub.currentPatients || 0} / {sub.maxPatients || "Unlimited"}</span>
                  </div>
                  <Progress value={sub.maxPatients ? ((sub.currentPatients || 0) / sub.maxPatients) * 100 : 10} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-16 text-center">
              <Zap className="w-12 h-12 mx-auto mb-4 text-primary opacity-40" />
              <p className="text-xl font-semibold mb-1">No active subscription</p>
              <p className="text-muted-foreground mb-6">Choose a plan to get started</p>
              <Button className="gap-2" onClick={() => setUpgradeOpen(true)}>
                <Zap className="w-4 h-4" /> Choose a Plan
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <UpgradeDialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} onSuccess={invalidate} />
    </DashboardLayout>
  );
}
