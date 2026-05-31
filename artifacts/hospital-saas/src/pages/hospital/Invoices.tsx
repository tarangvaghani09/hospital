import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListInvoices, getListInvoicesQueryKey,
  useGetInvoice,
  useListPatients, getListPatientsQueryKey,
  useListDoctors, getListDoctorsQueryKey,
  useCreateInvoice, useUpdateInvoicePayment,
  useGetHospitalProfile, getGetHospitalProfileQueryKey,
} from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Eye, Printer, MessageCircle, MoreVertical, X, Settings2, Upload, ImageIcon, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { createInvoiceSchema } from "@/lib/validations/invoice";

// ─── Invoice Settings (logo + template) stored in localStorage ───────────────
const SETTINGS_KEY = "medicore_invoice_settings";
interface InvoiceDisplaySettings {
  logoBase64: string;
  logoPosition: "left" | "right" | "header";
  template: "standard" | "compact" | "letterhead" | "thermal";
  accentColor: string;
  showDoctorSection: boolean;
  footerText: string;
}
function loadInvoiceSettings(): InvoiceDisplaySettings {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}"); } catch { return {} as any; }
}
function saveInvoiceSettings(s: Partial<InvoiceDisplaySettings>) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...loadInvoiceSettings(), ...s }));
}

const TEMPLATE_OPTIONS = [
  { value: "standard",    label: "Standard",    desc: "Clean two-column header with items table" },
  { value: "letterhead",  label: "Letterhead",  desc: "Full-width header banner with logo prominent" },
  { value: "compact",     label: "Compact",     desc: "Dense single-page for smaller receipts" },
  { value: "thermal",     label: "Thermal",     desc: "Narrow 80mm thermal printer format" },
];
const ACCENT_COLORS = ["#2563eb","#16a34a","#9333ea","#dc2626","#0891b2","#d97706","#374151"];

function InvoiceSettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const s = loadInvoiceSettings();
  const [logo, setLogo] = useState(s.logoBase64 ?? "");
  const [logoPosition, setLogoPosition] = useState<"left" | "right" | "header">(s.logoPosition ?? "left");
  const [template, setTemplate] = useState<string>(s.template ?? "standard");
  const [accent, setAccent] = useState(s.accentColor ?? "#2563eb");
  const [footer, setFooter] = useState(s.footerText ?? "");
  const [savingToDb, setSavingToDb] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast({ variant: "destructive", title: "Logo must be under 2 MB" }); return; }
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    saveInvoiceSettings({ logoBase64: logo, logoPosition, template: template as any, accentColor: accent, footerText: footer });

    // Save logo to DB (hospital profile)
    if (logo) {
      setSavingToDb(true);
      try {
        const token = localStorage.getItem("medicore_token");
        await fetch("/api/hospital/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ logoUrl: logo }),
        });
      } catch {
        // non-fatal: local settings still saved
      } finally {
        setSavingToDb(false);
      }
    }

    toast({ title: "Invoice settings saved", description: logo ? "Logo saved to database." : undefined });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Settings2 className="w-4 h-4" /> Invoice Format Settings</DialogTitle></DialogHeader>
        <div className="space-y-6 py-2">

          {/* Logo */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">Hospital Logo</Label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-20 border-2 border-dashed rounded-xl flex items-center justify-center bg-muted/30 overflow-hidden flex-shrink-0">
                {logo ? (
                  <img src={logo} alt="Logo" className="max-h-full max-w-full object-contain rounded-md" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-muted-foreground opacity-40" />
                )}
              </div>
              <div className="space-y-2">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()}>
                  <Upload className="w-3.5 h-3.5" /> Upload Logo
                </Button>
                {logo && (
                  <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setLogo("")}>
                    Remove
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">PNG, JPG or SVG · Max 500 KB</p>
              </div>
            </div>
          </div>

          {/* Logo Position */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">Logo Position</Label>
            <div className="flex gap-3">
              {([
                { value: "left",   label: "Left",          desc: "Top-left corner" },
                { value: "right",  label: "Right",         desc: "Top-right corner" },
                { value: "header", label: "Full-width Header", desc: "Full-width banner" },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLogoPosition(opt.value)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all flex-1 ${logoPosition === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                >
                  <div className={`w-full h-8 bg-muted/50 border border-border rounded flex items-center overflow-hidden ${opt.value === "header" ? "justify-center" : opt.value === "right" ? "justify-end px-1" : "justify-start px-1"}`}>
                    <div className="w-4 h-4 bg-primary/40 rounded-sm shrink-0" />
                  </div>
                  <span className="text-xs font-medium text-center">{opt.label}</span>
                  {logoPosition === opt.value && <Check className="w-3 h-3 text-primary" />}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Template */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">Layout Template</Label>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATE_OPTIONS.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTemplate(t.value)}
                  className={`text-left rounded-xl border-2 p-3 transition-all ${template === t.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{t.label}</span>
                    {template === t.value && <Check className="w-3.5 h-3.5 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Accent Color */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">Accent Color</Label>
            <div className="flex gap-2 flex-wrap">
              {ACCENT_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAccent(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${accent === c ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ background: c }}
                />
              ))}
              <div className="flex items-center gap-1.5 ml-2">
                <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-border" />
                <span className="text-xs text-muted-foreground">Custom</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Footer Text */}
          <div>
            <Label className="text-sm font-semibold mb-1 block">Footer Message</Label>
            <Textarea
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              rows={2}
              placeholder="e.g. Thank you for choosing our hospital. For queries call +91 XXXXX XXXXX"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={savingToDb}>
            {savingToDb ? "Saving…" : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Status colors ────────────────────────────────────────────────────────────
const statusColors: Record<string, string> = {
  PAID: "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400",
  UNPAID: "bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400",
  PARTIAL: "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400",
};

interface InvoiceItem {
  description: string;
  category: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

// ─── Create Invoice Dialog ────────────────────────────────────────────────────
export function CreateInvoiceDialog({
  open, onClose, onSuccess,
  prefillPatientId, prefillDoctorId,
}: {
  open: boolean; onClose: () => void; onSuccess: () => void;
  prefillPatientId?: number; prefillDoctorId?: number;
}) {
  const { toast } = useToast();
  const [patientId, setPatientId] = useState<string>("");
  const [doctorId, setDoctorId] = useState<string>("");
  const [patientSearch, setPatientSearch] = useState<string>("");
  const [items, setItems] = useState<InvoiceItem[]>([{ description: "", category: "CONSULTATION", quantity: 1, unitPrice: 0, amount: 0 }]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxPercentage, setTaxPercentage] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (open) {
      setPatientId(prefillPatientId ? String(prefillPatientId) : "");
      setDoctorId(prefillDoctorId ? String(prefillDoctorId) : "");
      setItems([{ description: "", category: "CONSULTATION", quantity: 1, unitPrice: 0, amount: 0 }]);
      setDiscountAmount(0); setTaxPercentage(0); setPaidAmount(0); setPaymentMethod(""); setNotes(""); setPatientSearch("");
    }
  }, [open, prefillPatientId, prefillDoctorId]);

  const { data: patientsData } = useListPatients({ search: patientSearch || undefined, limit: 50 }, { query: { queryKey: getListPatientsQueryKey({ search: patientSearch || undefined, limit: 50 }) } });
  const { data: doctorsData } = useListDoctors(undefined, { query: { queryKey: getListDoctorsQueryKey() } });
  const createMutation = useCreateInvoice();

  function updateItem(index: number, field: keyof InvoiceItem, value: any) {
    setItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === "quantity" || field === "unitPrice") {
        next[index].amount = (field === "quantity" ? value : next[index].quantity) * (field === "unitPrice" ? value : next[index].unitPrice);
      }
      if (field === "amount") next[index].unitPrice = value / (next[index].quantity || 1);
      return next;
    });
  }
  function addItem() { setItems(prev => [...prev, { description: "", category: "CONSULTATION", quantity: 1, unitPrice: 0, amount: 0 }]); }
  function removeItem(i: number) { setItems(prev => prev.filter((_, idx) => idx !== i)); }

  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const taxAmount = ((subtotal - discountAmount) * taxPercentage) / 100;
  const totalAmount = subtotal - discountAmount + taxAmount;
  const dueAmount = Math.max(0, totalAmount - paidAmount);

  function handleSubmit() {
    const parsed = createInvoiceSchema.safeParse({
      patientId,
      doctorId,
      items,
      discountAmount,
      taxPercentage,
      paidAmount,
      paymentMethod,
      notes,
    });
    if (!parsed.success) {
      toast({ variant: "destructive", title: parsed.error.issues[0]?.message ?? "Invalid input" });
      return;
    }
    createMutation.mutate({
      data: {
        patientId: parseInt(patientId),
        doctorId: doctorId && doctorId !== "_none" ? parseInt(doctorId) : undefined,
        items: items.map(i => ({ description: i.description, category: i.category, quantity: i.quantity, unitPrice: i.unitPrice, amount: i.amount })),
        discountAmount, taxPercentage, paidAmount,
        paymentMethod: paymentMethod || undefined, notes: notes || undefined,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Invoice created" });
        setPatientId("");
        setDoctorId("");
        setPatientSearch("");
        setItems([{ description: "", category: "CONSULTATION", quantity: 1, unitPrice: 0, amount: 0 }]);
        setDiscountAmount(0);
        setTaxPercentage(0);
        setPaidAmount(0);
        setPaymentMethod("");
        setNotes("");
        onSuccess();
        onClose();
      },
      onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Patient <span className="text-red-500">*</span></Label>
              <Input placeholder="Search..." value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} className="mb-1" />
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent className="max-h-64 overflow-y-auto">
                  {patientsData?.patients?.map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name} {p.phone ? `(${p.phone})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Doctor (optional)</Label>
              <Select value={doctorId} onValueChange={setDoctorId}>
                <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                <SelectContent className="max-h-64 overflow-y-auto">
                  <SelectItem value="_none">None</SelectItem>
                  {doctorsData?.map((d: any) => (
                    <SelectItem key={d.id} value={String(d.id)}>Dr. {d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="w-3 h-3 mr-1" /> Add Item</Button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                  <Input placeholder="Description" value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} />
                  <Select value={item.category} onValueChange={(v) => updateItem(i, "category", v)}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-64 overflow-y-auto">
                      <SelectItem value="CONSULTATION">Consultation</SelectItem>
                      <SelectItem value="PROCEDURE">Procedure</SelectItem>
                      <SelectItem value="MEDICINE">Medicine</SelectItem>
                      <SelectItem value="LAB">Lab</SelectItem>
                      <SelectItem value="IMAGING">Imaging</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(i, "quantity", parseInt(e.target.value) || 1)} min={1} />
                  <Input
                    type="number"
                    min={0}
                    placeholder="Price"
                    value={item.unitPrice || ""}
                    onChange={(e) => updateItem(i, "unitPrice", Math.max(0, parseFloat(e.target.value) || 0))}
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder="Amount"
                    value={item.amount || ""}
                    onChange={(e) => updateItem(i, "amount", Math.max(0, parseFloat(e.target.value) || 0))}
                  />
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => removeItem(i)} disabled={items.length === 1}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Separator />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Discount (₹)</Label>
              <Input type="number" value={discountAmount || ""} onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)} min={0} />
            </div>
            <div className="space-y-1">
              <Label>Tax (%)</Label>
              <Input type="number" value={taxPercentage || ""} onChange={(e) => setTaxPercentage(parseFloat(e.target.value) || 0)} min={0} />
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
            {discountAmount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-green-600">-₹{discountAmount.toFixed(2)}</span></div>}
            {taxAmount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax ({taxPercentage}%)</span><span>₹{taxAmount.toFixed(2)}</span></div>}
            <div className="flex justify-between font-semibold text-base pt-1 border-t"><span>Total</span><span>₹{totalAmount.toFixed(2)}</span></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Paid Amount (₹)</Label>
              <Input type="number" value={paidAmount || ""} onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)} min={0} />
            </div>
            <div className="space-y-1">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                <SelectContent className="max-h-64 overflow-y-auto">
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="INSURANCE">Insurance</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {dueAmount > 0 && <p className="text-sm text-amber-600 font-medium">Due amount: ₹{dueAmount.toFixed(2)}</p>}
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Additional notes..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Print HTML builders per template ────────────────────────────────────────
function logoRadiusStyle(shape?: string): string {
  if (shape === "circle") return "border-radius:50%;width:60px;height:60px;object-fit:cover;";
  if (shape === "square") return "border-radius:0;";
  return "border-radius:8px;"; // default rounded
}

function buildPrintHTML(inv: any, hospital: any, cfg: InvoiceDisplaySettings): string {
  const accent = cfg.accentColor || "#2563eb";
  const logoSrc = hospital?.logoUrl || cfg.logoBase64 || "";
  const logo = logoSrc ? `<img src="${logoSrc}" style="max-height:60px;max-width:180px;object-fit:contain;border-radius:8px;" />` : "";
  const logoPos = cfg.logoPosition || "left";
  const footer = cfg.footerText || `Thank you for choosing ${hospital?.name ?? "our hospital"}.`;
  const template = cfg.template || "standard";

  const itemsTable = `
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <thead>
        <tr style="background:${accent}15">
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;color:${accent};border-bottom:2px solid ${accent}">#</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;color:${accent};border-bottom:2px solid ${accent}">Description</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;color:${accent};border-bottom:2px solid ${accent}">Category</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;color:${accent};border-bottom:2px solid ${accent}">Qty</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;color:${accent};border-bottom:2px solid ${accent}">Unit Price</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;color:${accent};border-bottom:2px solid ${accent}">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${(inv.items ?? []).map((item: any, i: number) => `
          <tr>
            <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#666">${i + 1}</td>
            <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:500">${item.description}</td>
            <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;font-size:12px;color:#888;text-transform:capitalize">${item.category?.toLowerCase() ?? ""}</td>
            <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right">${item.quantity}</td>
            <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right">₹${Number(item.unitPrice).toLocaleString()}</td>
            <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:600;text-align:right">₹${Number(item.amount).toLocaleString()}</td>
          </tr>`).join("")}
      </tbody>
    </table>`;

  const totalsBlock = `
    <div style="display:flex;justify-content:flex-end;margin-bottom:20px">
      <div style="min-width:260px">
        <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px"><span style="color:#666">Subtotal</span><span>₹${Number(inv.subtotal).toLocaleString()}</span></div>
        ${Number(inv.discountAmount) > 0 ? `<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#16a34a"><span>Discount</span><span>-₹${Number(inv.discountAmount).toLocaleString()}</span></div>` : ""}
        ${Number(inv.taxAmount) > 0 ? `<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px"><span style="color:#666">Tax (${Number(inv.taxPercentage)}%)</span><span>₹${Number(inv.taxAmount).toLocaleString()}</span></div>` : ""}
        <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:16px;font-weight:700;border-top:2px solid #111;margin-top:6px"><span>Total</span><span>₹${Number(inv.totalAmount).toLocaleString()}</span></div>
        ${Number(inv.paidAmount) > 0 ? `<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#16a34a"><span>Paid</span><span>₹${Number(inv.paidAmount).toLocaleString()}</span></div>` : ""}
        ${Number(inv.dueAmount) > 0 ? `<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:14px;font-weight:700;color:#dc2626"><span>Due</span><span>₹${Number(inv.dueAmount).toLocaleString()}</span></div>` : ""}
      </div>
    </div>`;

  const statusBadge = `<span style="display:inline-block;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700;${inv.status === "PAID" ? "background:#dcfce7;color:#166534" : inv.status === "UNPAID" ? "background:#fee2e2;color:#991b1b" : "background:#fef3c7;color:#92400e"}">${inv.status}</span>`;

  const footerHtml = `
    <div style="margin-top:30px;border-top:1px solid #e5e7eb;padding-top:12px;font-size:11px;color:#9ca3af;text-align:center">
      ${footer}
      ${inv.paymentMethod ? `<br/><span style="margin-top:4px;display:inline-block">Payment: ${inv.paymentMethod}</span>` : ""}
    </div>`;

  const notesHtml = inv.notes ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px;font-size:13px;margin-bottom:16px"><strong>Notes:</strong> ${inv.notes}</div>` : "";

  if (template === "thermal") {
    return `<!DOCTYPE html><html><head><title>Invoice ${inv.invoiceNumber}</title>
      <style>body{font-family:monospace;font-size:12px;width:280px;margin:0 auto;padding:10px}hr{border:none;border-top:1px dashed #ccc}@media print{body{width:80mm}}</style>
      </head><body>
      <div style="text-align:center;margin-bottom:8px">
        ${logo ? `<div>${logo}</div>` : ""}
        <strong style="font-size:15px">${hospital?.name ?? "Hospital"}</strong><br/>
        ${hospital?.address ? `<span style="font-size:11px">${hospital.address}</span><br/>` : ""}
        ${hospital?.phone ? `<span>${hospital.phone}</span><br/>` : ""}
      </div>
      <hr/><div style="text-align:center;font-size:13px;font-weight:700;margin:6px 0">INVOICE</div>
      <div style="display:flex;justify-content:space-between"><span>${inv.invoiceNumber}</span><span>${new Date(inv.createdAt).toLocaleDateString()}</span></div>
      <div>Patient: <strong>${inv.patientName}</strong></div>
      ${inv.doctorName ? `<div>Doctor: Dr. ${inv.doctorName}</div>` : ""}
      <hr/>
      ${(inv.items ?? []).map((item: any) => `<div style="display:flex;justify-content:space-between"><span>${item.description} x${item.quantity}</span><span>₹${Number(item.amount).toLocaleString()}</span></div>`).join("")}
      <hr/>
      ${Number(inv.discountAmount) > 0 ? `<div style="display:flex;justify-content:space-between"><span>Discount</span><span>-₹${Number(inv.discountAmount).toLocaleString()}</span></div>` : ""}
      ${Number(inv.taxAmount) > 0 ? `<div style="display:flex;justify-content:space-between"><span>Tax</span><span>₹${Number(inv.taxAmount).toLocaleString()}</span></div>` : ""}
      <div style="display:flex;justify-content:space-between;font-weight:700;font-size:14px"><span>TOTAL</span><span>₹${Number(inv.totalAmount).toLocaleString()}</span></div>
      ${Number(inv.paidAmount) > 0 ? `<div style="display:flex;justify-content:space-between"><span>Paid</span><span>₹${Number(inv.paidAmount).toLocaleString()}</span></div>` : ""}
      ${Number(inv.dueAmount) > 0 ? `<div style="display:flex;justify-content:space-between;font-weight:700;color:#dc2626"><span>DUE</span><span>₹${Number(inv.dueAmount).toLocaleString()}</span></div>` : ""}
      <hr/><div style="text-align:center;font-size:11px">${footer}</div>
      <script>setTimeout(()=>window.print(),300)</script>
      </body></html>`;
  }

  if (template === "letterhead") {
    return `<!DOCTYPE html><html><head><title>Invoice ${inv.invoiceNumber}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:13px;color:#111;background:#fff}@media print{body{}}  </style>
      </head><body>
      <div style="background:${accent};color:#fff;padding:28px 32px;display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;align-items:center;gap:16px">
          ${logo ? `<div style="background:#fff;border-radius:8px;padding:4px">${logo}</div>` : ""}
          <div>
            <div style="font-size:20px;font-weight:700">${hospital?.name ?? "Hospital"}</div>
            ${hospital?.address ? `<div style="font-size:12px;opacity:0.85">${hospital.address}</div>` : ""}
            ${hospital?.phone ? `<div style="font-size:12px;opacity:0.85">${hospital.phone}</div>` : ""}
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:28px;font-weight:800;letter-spacing:.05em">INVOICE</div>
          <div style="font-size:16px;font-weight:600">${inv.invoiceNumber}</div>
          <div style="font-size:12px;opacity:0.85">${new Date(inv.createdAt).toLocaleDateString()}</div>
          <div style="margin-top:6px">${statusBadge.replace(/color:#166534/, 'color:#166534').replace('color:#991b1b', 'color:#991b1b')}</div>
        </div>
      </div>
      <div style="padding:28px 32px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px">
            <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:${accent};margin-bottom:8px">Bill To</div>
            <div style="font-weight:600">${inv.patientName}</div>
            ${inv.patientPhone ? `<div style="font-size:12px;color:#666">${inv.patientPhone}</div>` : ""}
          </div>
          ${inv.doctorName ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px"><div style="font-size:11px;font-weight:600;text-transform:uppercase;color:${accent};margin-bottom:8px">Treating Doctor</div><div style="font-weight:600">Dr. ${inv.doctorName}</div></div>` : "<div></div>"}
        </div>
        ${itemsTable}${totalsBlock}${notesHtml}${footerHtml}
      </div>
      <script>setTimeout(()=>window.print(),300)</script>
      </body></html>`;
  }

  if (template === "compact") {
    return `<!DOCTYPE html><html><head><title>Invoice ${inv.invoiceNumber}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:12px;color:#111;background:#fff;padding:20px}table{width:100%;border-collapse:collapse}th,td{padding:7px 10px}@media print{body{padding:10px}}</style>
      </head><body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid ${accent}">
        <div style="display:flex;align-items:center;gap:12px">
          ${logo ? logo : ""}
          <div>
            <div style="font-size:16px;font-weight:700;color:${accent}">${hospital?.name ?? "Hospital"}</div>
            ${hospital?.address ? `<div style="font-size:11px;color:#666">${hospital.address}</div>` : ""}
            ${hospital?.phone ? `<div style="font-size:11px;color:#666">${hospital.phone}</div>` : ""}
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:20px;font-weight:800;color:${accent}">INVOICE</div>
          <div style="font-size:13px;font-weight:600">${inv.invoiceNumber}</div>
          <div style="font-size:11px;color:#666">${new Date(inv.createdAt).toLocaleDateString()}</div>
          <div style="margin-top:4px">${statusBadge}</div>
        </div>
      </div>
      <div style="display:flex;gap:16px;margin-bottom:16px;font-size:12px">
        <span><strong>Patient:</strong> ${inv.patientName}${inv.patientPhone ? ` · ${inv.patientPhone}` : ""}</span>
        ${inv.doctorName ? `<span><strong>Doctor:</strong> Dr. ${inv.doctorName}</span>` : ""}
      </div>
      ${itemsTable}${totalsBlock}${notesHtml}${footerHtml}
      <script>setTimeout(()=>window.print(),300)</script>
      </body></html>`;
  }

  // Standard (default)
  const hospitalInfo = `
    <div>
      <div style="font-size:32px;font-weight:800;color:${accent}">INVOICE</div>
      <div style="font-size:16px;font-weight:600;margin-top:4px">${hospital?.name ?? "Hospital"}</div>
      ${hospital?.address ? `<div style="font-size:12px;color:#666">${hospital.address}</div>` : ""}
      <div style="font-size:12px;color:#666">${[hospital?.phone, hospital?.email].filter(Boolean).join(" · ")}</div>
      ${hospital?.gstNumber ? `<div style="font-size:12px;color:#666">GST: ${hospital.gstNumber}</div>` : ""}
    </div>`;
  const invMeta = `
    <div style="text-align:right">
      <div style="font-size:22px;font-weight:700">${inv.invoiceNumber}</div>
      <div style="font-size:12px;color:#666;margin-top:4px">Date: ${new Date(inv.createdAt).toLocaleDateString()}</div>
      <div style="margin-top:8px">${statusBadge}</div>
    </div>`;

  let headerHtml = "";
  if (logoPos === "header" && logo) {
    headerHtml = `
      <div style="width:100%;margin-bottom:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;display:flex;align-items:center;justify-content:center">
        <img src="${logoSrc}" style="max-height:80px;max-width:100%;object-fit:contain;border-radius:8px;" />
      </div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px">
        ${hospitalInfo}${invMeta}
      </div>`;
  } else if (logoPos === "right" && logo) {
    headerHtml = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px">
        ${hospitalInfo}
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:12px">
          <div style="margin-bottom:4px">${logo}</div>
          ${invMeta.replace('<div style="text-align:right">', '<div style="text-align:right">')}
        </div>
      </div>`;
  } else {
    headerHtml = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px">
        <div>
          ${logo ? `<div style="margin-bottom:8px">${logo}</div>` : ""}
          <div style="font-size:32px;font-weight:800;color:${accent}">INVOICE</div>
          <div style="font-size:16px;font-weight:600;margin-top:4px">${hospital?.name ?? "Hospital"}</div>
          ${hospital?.address ? `<div style="font-size:12px;color:#666">${hospital.address}</div>` : ""}
          <div style="font-size:12px;color:#666">${[hospital?.phone, hospital?.email].filter(Boolean).join(" · ")}</div>
          ${hospital?.gstNumber ? `<div style="font-size:12px;color:#666">GST: ${hospital.gstNumber}</div>` : ""}
        </div>
        ${invMeta}
      </div>`;
  }

  return `<!DOCTYPE html><html><head><title>Invoice ${inv.invoiceNumber}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:13px;color:#111;background:#fff;padding:32px}@media print{body{padding:16px}}</style>
    </head><body>
    ${headerHtml}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px">
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:${accent};margin-bottom:8px">Bill To</div>
        <div style="font-weight:600">${inv.patientName}</div>
        ${inv.patientPhone ? `<div style="font-size:12px;color:#666">${inv.patientPhone}</div>` : ""}
      </div>
      ${inv.doctorName ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px"><div style="font-size:11px;font-weight:600;text-transform:uppercase;color:${accent};margin-bottom:8px">Treating Doctor</div><div style="font-weight:600">Dr. ${inv.doctorName}</div></div>` : "<div></div>"}
    </div>
    ${itemsTable}${totalsBlock}${notesHtml}${footerHtml}
    <script>setTimeout(()=>window.print(),300)</script>
    </body></html>`;
}

// ─── Invoice Preview Dialog ───────────────────────────────────────────────────
function InvoicePreviewDialog({ invoiceId, open, onClose }: { invoiceId: number | null; open: boolean; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null);
  const [displaySettings, setDisplaySettings] = useState(loadInvoiceSettings);
  const { data: hospitalProfile } = useGetHospitalProfile({ query: { queryKey: getGetHospitalProfileQueryKey() } });
  const { data: invoice } = useGetInvoice(
    invoiceId ?? 0,
    { query: { queryKey: ["invoice", invoiceId], enabled: !!invoiceId } }
  );

  useEffect(() => {
    if (open) setDisplaySettings(loadInvoiceSettings());
  }, [open]);

  function handlePrint() {
    if (!invoice) return;
    const win = window.open("", "_blank", "width=860,height=920");
    if (!win) return;
    win.document.write(buildPrintHTML(invoice as any, hospitalProfile as any, displaySettings));
    win.document.close();
    win.focus();
  }

  function handleWhatsApp() {
    if (!invoice) return;
    const inv = invoice as any;
    const phone = inv.patientPhone?.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `*Invoice ${inv.invoiceNumber}*\n` +
      `Patient: ${inv.patientName}\n` +
      `Date: ${new Date(inv.createdAt).toLocaleDateString()}\n` +
      `Total: ₹${Number(inv.totalAmount).toLocaleString()}\n` +
      `Paid: ₹${Number(inv.paidAmount).toLocaleString()}\n` +
      `Due: ₹${Number(inv.dueAmount).toLocaleString()}\n` +
      `Status: ${inv.status}\n\n` +
      `Thank you for visiting ${(hospitalProfile as any)?.name ?? "our hospital"}.`
    );
    window.open(phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`, "_blank");
  }

  const inv = invoice as any;
  const accent = displaySettings.accentColor || "#2563eb";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <DialogTitle className="text-center sm:text-left">Invoice Preview</DialogTitle>
            <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:flex-wrap sm:mr-6">
              <Button variant="outline" size="sm" onClick={handleWhatsApp} className="gap-1.5 w-full">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 w-full">
                <Printer className="w-4 h-4" /> Print
              </Button>
            </div>
          </div>
        </DialogHeader>

        {!inv ? (
          <div className="py-8 text-center text-muted-foreground">Loading invoice...</div>
        ) : (
          <div ref={printRef} className="font-sans text-sm text-foreground overflow-x-hidden">
            {/* Logo Header — position-aware */}
            {(() => {
              const logoSrc = (hospitalProfile as any)?.logoUrl || displaySettings.logoBase64 || "";
              const pos = displaySettings.logoPosition || "left";
              const logoImg = logoSrc ? (
                <img src={logoSrc} alt="Hospital Logo" className="max-h-14 max-w-[180px] object-contain rounded-md" />
              ) : null;
              const hospitalInfo = (
                <div>
                  <div className="text-3xl font-bold mb-1" style={{ color: accent }}>INVOICE</div>
                  <div className="text-lg font-semibold">{(hospitalProfile as any)?.name ?? "Hospital"}</div>
                  <div className="text-xs text-muted-foreground">{(hospitalProfile as any)?.address}</div>
                  <div className="text-xs text-muted-foreground">{[((hospitalProfile as any)?.phone), ((hospitalProfile as any)?.email)].filter(Boolean).join(" · ")}</div>
                  {(hospitalProfile as any)?.gstNumber && <div className="text-xs text-muted-foreground">GST: {(hospitalProfile as any)?.gstNumber}</div>}
                </div>
              );
              const invMeta = (
                <div className="text-right shrink-0">
                  <div className="text-xl font-bold">{inv.invoiceNumber}</div>
                  <div className="text-xs text-muted-foreground mt-1">Date: {new Date(inv.createdAt).toLocaleDateString()}</div>
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      inv.status === "PAID" ? "bg-green-100 text-green-800" :
                      inv.status === "UNPAID" ? "bg-red-100 text-red-800" :
                      "bg-amber-100 text-amber-800"
                    }`}>{inv.status}</span>
                  </div>
                </div>
              );
              if (pos === "header" && logoImg) return (
                <div className="mb-6">
                  <div className="w-full bg-muted/30 border rounded-lg p-3 flex justify-center mb-4">{logoImg}</div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start min-w-0">{hospitalInfo}{invMeta}</div>
                </div>
              );
              if (pos === "right" && logoImg) return (
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start mb-6 min-w-0">
                  {hospitalInfo}
                  <div className="flex flex-col items-end gap-2">{logoImg}{invMeta}</div>
                </div>
              );
              return (
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start mb-6 min-w-0">
                  <div>{logoImg && <div className="mb-2">{logoImg}</div>}{hospitalInfo}</div>
                  {invMeta}
                </div>
              );
            })()}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-muted/40 rounded-lg p-4 border">
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-2 tracking-wide" style={{ color: accent }}>Bill To</div>
                <div className="font-semibold break-words">{inv.patientName}</div>
                {inv.patientPhone && <div className="text-xs text-muted-foreground break-all">{inv.patientPhone}</div>}
              </div>
              {inv.doctorName && (
                <div className="bg-muted/40 rounded-lg p-4 border">
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-2 tracking-wide" style={{ color: accent }}>Treating Doctor</div>
                  <div className="font-semibold">Dr. {inv.doctorName}</div>
                </div>
              )}
            </div>

            <div className="overflow-x-auto mb-6 md:[&::-webkit-scrollbar]:h-2.5 md:[&::-webkit-scrollbar]:w-2.5 md:[&::-webkit-scrollbar-track]:bg-transparent md:[&::-webkit-scrollbar-thumb]:rounded-full md:[&::-webkit-scrollbar-thumb]:bg-slate-500/70 md:[&::-webkit-scrollbar-thumb]:border-2 md:[&::-webkit-scrollbar-thumb]:border-transparent md:[&::-webkit-scrollbar-thumb]:bg-clip-content">
            <table className="w-full min-w-[680px] border-collapse">
              <thead>
                <tr className="bg-muted/60">
                  <th className="text-left py-2.5 px-3 text-xs font-semibold uppercase text-muted-foreground">#</th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold uppercase text-muted-foreground">Description</th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold uppercase text-muted-foreground">Category</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold uppercase text-muted-foreground">Qty</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold uppercase text-muted-foreground">Unit Price</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold uppercase text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(inv.items ?? []).map((item: any, i: number) => (
                  <tr key={i} className="border-b">
                    <td className="py-2.5 px-3 text-muted-foreground">{i + 1}</td>
                    <td className="py-2.5 px-3 font-medium">{item.description}</td>
                    <td className="py-2.5 px-3 text-muted-foreground capitalize text-xs">{item.category?.toLowerCase()}</td>
                    <td className="py-2.5 px-3 text-right">{item.quantity}</td>
                    <td className="py-2.5 px-3 text-right">₹{Number(item.unitPrice).toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-medium">₹{Number(item.amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            <div className="flex justify-end mb-6">
              <div className="min-w-[260px] space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{Number(inv.subtotal).toLocaleString()}</span></div>
                {Number(inv.discountAmount) > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{Number(inv.discountAmount).toLocaleString()}</span></div>}
                {Number(inv.taxAmount) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax ({Number(inv.taxPercentage)}%)</span><span>₹{Number(inv.taxAmount).toLocaleString()}</span></div>}
                <div className="flex justify-between font-bold text-base border-t pt-2 mt-1"><span>Total</span><span>₹{Number(inv.totalAmount).toLocaleString()}</span></div>
                {Number(inv.paidAmount) > 0 && <div className="flex justify-between text-green-600"><span>Paid</span><span>₹{Number(inv.paidAmount).toLocaleString()}</span></div>}
                {Number(inv.dueAmount) > 0 && <div className="flex justify-between text-red-600 font-semibold"><span>Due</span><span>₹{Number(inv.dueAmount).toLocaleString()}</span></div>}
              </div>
            </div>

            {inv.paymentMethod && <div className="text-xs text-muted-foreground mb-4">Payment Method: <span className="font-medium">{inv.paymentMethod}</span></div>}
            {inv.notes && <div className="bg-muted/40 rounded p-3 text-sm mb-4"><span className="font-medium">Notes: </span>{inv.notes}</div>}
            <div className="text-xs text-muted-foreground border-t pt-3 text-center">
              {displaySettings.footerText || `Thank you for choosing ${(hospitalProfile as any)?.name ?? "our hospital"}.`}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Payment Update Dialog ────────────────────────────────────────────────────
function PaymentUpdateDialog({ invoiceId, open, onClose, onSuccess }: { invoiceId: number | null; open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const [status, setStatus] = useState("PAID");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const updatePayment = useUpdateInvoicePayment();
  const { data: invoice } = useGetInvoice(invoiceId ?? 0, { query: { queryKey: ["invoice", invoiceId, "payment"], enabled: !!invoiceId } });
  const inv = invoice as any;

  function handleSubmit() {
    if (!invoiceId) return;
    updatePayment.mutate({ id: invoiceId, data: { status, paymentMethod, paidAmount } }, {
      onSuccess: () => { toast({ title: "Payment updated" }); onSuccess(); onClose(); },
      onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Update Payment</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          {inv && <div className="bg-muted/50 rounded p-3 text-sm"><div className="font-medium">{inv.invoiceNumber}</div><div className="text-muted-foreground">Total: ₹{Number(inv.totalAmount).toLocaleString()}</div></div>}
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="PARTIAL">Partial</SelectItem>
                <SelectItem value="UNPAID">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="CARD">Card</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="INSURANCE">Insurance</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Paid Amount (₹)</Label>
            <Input type="number" value={paidAmount || ""} onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)} min={0} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={updatePayment.isPending}>
            {updatePayment.isPending ? "Saving..." : "Update Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Invoices Page ───────────────────────────────────────────────────────
export function Invoices() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const params = { status: statusFilter && statusFilter !== "all" ? statusFilter : undefined, page: 1, limit: 50 };
  const { data, isLoading } = useListInvoices(params, { query: { queryKey: getListInvoicesQueryKey(params) } });

  function onSuccess() { queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() }); }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-6 sm:pb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
            <p className="text-muted-foreground mt-2">Manage patient billing and payments</p>
          </div>
          <div className="flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:justify-end">
            <Button variant="outline" className="gap-1.5 w-full sm:w-auto" onClick={() => setSettingsOpen(true)}>
              <Settings2 className="w-4 h-4" /> Format
            </Button>
            <Button className="gap-2 cursor-pointer w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4" /> Create Invoice
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="py-4">
            <div className="w-full sm:w-[200px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="UNPAID">Unpaid</SelectItem>
                  <SelectItem value="PARTIAL">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[980px] sm:min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(10)].map((_, i) => (
                    <TableRow key={`invoice-skeleton-${i}`}>
                      <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-44" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-36" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-md" /></TableCell>
                    </TableRow>
                  ))
                ) : data?.invoices.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No invoices found</TableCell></TableRow>
                ) : data?.invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : "-"}</TableCell>
                    <TableCell>
                      <div>{invoice.patientName || "Walk-in"}</div>
                      {(invoice as any).patientPhone && <div className="text-xs text-muted-foreground">{(invoice as any).patientPhone}</div>}
                    </TableCell>
                    <TableCell className="text-sm">{(invoice as any).doctorName ? `Dr. ${(invoice as any).doctorName}` : "-"}</TableCell>
                    <TableCell className="font-semibold">₹{Number(invoice.totalAmount).toLocaleString()}</TableCell>
                    <TableCell className="text-green-600">₹{Number((invoice as any).paidAmount ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="text-red-600">₹{Number((invoice as any).dueAmount ?? 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[invoice.status] ?? "bg-gray-100 text-gray-800"}>{invoice.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setPreviewId(invoice.id)}>
                            <Eye className="w-4 h-4 mr-2" /> Preview &amp; Print
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            const inv = invoice as any;
                            const phone = inv.patientPhone?.replace(/\D/g, "");
                            const msg = encodeURIComponent(`Invoice ${inv.invoiceNumber}\nPatient: ${inv.patientName}\nTotal: ₹${Number(inv.totalAmount).toLocaleString()}\nDue: ₹${Number(inv.dueAmount).toLocaleString()}\nStatus: ${inv.status}`);
                            window.open(phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`, "_blank");
                          }}>
                            <MessageCircle className="w-4 h-4 mr-2" /> Send WhatsApp
                          </DropdownMenuItem>
                          {invoice.status !== "PAID" && (
                            <DropdownMenuItem onClick={() => setPaymentId(invoice.id)}>
                              <Printer className="w-4 h-4 mr-2" /> Update Payment
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <CreateInvoiceDialog open={createOpen} onClose={() => setCreateOpen(false)} onSuccess={onSuccess} />
      <InvoicePreviewDialog invoiceId={previewId} open={!!previewId} onClose={() => setPreviewId(null)} />
      <PaymentUpdateDialog invoiceId={paymentId} open={!!paymentId} onClose={() => setPaymentId(null)} onSuccess={onSuccess} />
      <InvoiceSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </DashboardLayout>
  );
}
