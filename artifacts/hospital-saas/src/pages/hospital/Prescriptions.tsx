import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListPrescriptions, getListPrescriptionsQueryKey,
  useCreatePrescription,
  useListPatients, getListPatientsQueryKey,
  useListDoctors, getListDoctorsQueryKey,
} from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Pill, User, Stethoscope, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

interface Medicine {
  name: string;
  dosage: string;
  timing: string;
  duration: string;
  instructions: string;
}

function emptyMed(): Medicine {
  return { name: "", dosage: "", timing: "After meals", duration: "7 days", instructions: "" };
}

function NewPrescriptionDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [advice, setAdvice] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([emptyMed()]);

  const isDoctor = user?.role === "DOCTOR";

  const { data: patientsData } = useListPatients(
    { search: patientSearch || undefined, limit: 50 },
    { query: { queryKey: getListPatientsQueryKey({ search: patientSearch || undefined, limit: 50 }) } }
  );
  const { data: doctors } = useListDoctors(undefined, { query: { queryKey: getListDoctorsQueryKey() } });
  const mutation = useCreatePrescription();

  function setMed(i: number, k: keyof Medicine, v: string) {
    setMedicines(p => { const n = [...p]; n[i] = { ...n[i], [k]: v }; return n; });
  }
  function addMed() { setMedicines(p => [...p, emptyMed()]); }
  function removeMed(i: number) { setMedicines(p => p.filter((_, idx) => idx !== i)); }

  function handleSubmit() {
    if (!patientId) { toast({ variant: "destructive", title: "Patient is required" }); return; }
    if (!isDoctor && !doctorId) { toast({ variant: "destructive", title: "Doctor is required" }); return; }
    if (medicines.some(m => !m.name.trim())) { toast({ variant: "destructive", title: "All medicines need a name" }); return; }

    mutation.mutate({
      data: {
        patientId: parseInt(patientId),
        doctorId: isDoctor ? 0 : parseInt(doctorId),
        symptoms: symptoms || undefined,
        diagnosis: diagnosis || undefined,
        medicines: medicines.map(m => ({ name: m.name, dosage: m.dosage, timing: m.timing, duration: m.duration, instructions: m.instructions || undefined })),
        advice: advice || undefined,
        followUpDate: followUpDate || undefined,
      }
    }, {
      onSuccess: () => { toast({ title: "Prescription created" }); onSuccess(); onClose(); },
      onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Prescription</DialogTitle></DialogHeader>
        <div className="space-y-5 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Patient <span className="text-red-500">*</span></Label>
              <Input placeholder="Search patient..." value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} className="mb-1" />
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>
                  {patientsData?.patients?.map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}{p.phone ? ` — ${p.phone}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!isDoctor && (
              <div className="space-y-1">
                <Label>Doctor <span className="text-red-500">*</span></Label>
                <Select value={doctorId} onValueChange={setDoctorId}>
                  <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                  <SelectContent>
                    {doctors?.map((d: any) => (
                      <SelectItem key={d.id} value={String(d.id)}>Dr. {d.name}{d.specialization ? ` — ${d.specialization}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Symptoms</Label>
              <Textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} rows={2} placeholder="Chief complaints..." />
            </div>
            <div className="space-y-1">
              <Label>Diagnosis</Label>
              <Textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} rows={2} placeholder="Clinical diagnosis..." />
            </div>
          </div>

          <Separator />
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold flex items-center gap-2"><Pill className="w-4 h-4" /> Medicines</Label>
              <Button type="button" variant="outline" size="sm" onClick={addMed}><Plus className="w-3.5 h-3.5 mr-1" /> Add Medicine</Button>
            </div>
            <div className="space-y-3">
              {medicines.map((med, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground w-4">{i + 1}.</span>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input placeholder="Medicine name" value={med.name} onChange={(e) => setMed(i, "name", e.target.value)} />
                      <Input placeholder="Dosage (e.g. 500mg)" value={med.dosage} onChange={(e) => setMed(i, "dosage", e.target.value)} />
                      <Input placeholder="Timing (e.g. After meals)" value={med.timing} onChange={(e) => setMed(i, "timing", e.target.value)} />
                      <Input placeholder="Duration (e.g. 7 days)" value={med.duration} onChange={(e) => setMed(i, "duration", e.target.value)} />
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
                      onClick={() => removeMed(i)} disabled={medicines.length === 1}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <Input placeholder="Special instructions (optional)" value={med.instructions} onChange={(e) => setMed(i, "instructions", e.target.value)} className="ml-6" />
                </div>
              ))}
            </div>
          </div>

          <Separator />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Advice / Notes</Label>
              <Textarea value={advice} onChange={(e) => setAdvice(e.target.value)} rows={2} placeholder="Rest, diet, lifestyle advice..." />
            </div>
            <div className="space-y-1">
              <Label>Follow-up Date</Label>
              <Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save Prescription"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ViewPrescriptionDialog({ rx, open, onClose }: { rx: any; open: boolean; onClose: () => void }) {
  if (!rx) return null;

  function handlePrint() {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Prescription #${rx.id}</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 700px; margin: 30px auto; padding: 0 20px; color: #111; }
        .header { border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 20px; }
        .row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 14px; }
        .section-title { font-weight: bold; font-size: 13px; text-transform: uppercase; color: #555; margin: 16px 0 8px; letter-spacing: .05em; }
        .med-row { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 14px; margin-bottom: 8px; }
        .med-name { font-weight: 600; }
        .med-meta { font-size: 13px; color: #555; margin-top: 4px; }
        .footer { margin-top: 40px; text-align: right; font-size: 13px; }
        @media print { button { display: none; } }
      </style></head><body>
      <div class="header">
        <h2 style="margin:0">Prescription</h2>
        <div class="row"><span>Dr. ${rx.doctorName}${rx.doctorSpecialization ? ` — ${rx.doctorSpecialization}` : ""}</span><span>Date: ${new Date(rx.createdAt).toLocaleDateString()}</span></div>
      </div>
      <div class="row"><strong>Patient:</strong> ${rx.patientName}</div>
      ${rx.symptoms ? `<div class="section-title">Symptoms</div><p style="font-size:14px">${rx.symptoms}</p>` : ""}
      ${rx.diagnosis ? `<div class="section-title">Diagnosis</div><p style="font-size:14px;font-weight:600">${rx.diagnosis}</p>` : ""}
      <div class="section-title">Medicines (${rx.medicines?.length || 0})</div>
      ${(rx.medicines || []).map((m: any, i: number) => `
        <div class="med-row">
          <div class="med-name">${i + 1}. ${m.name} — ${m.dosage}</div>
          <div class="med-meta">${m.timing} · ${m.duration}${m.instructions ? ` · ${m.instructions}` : ""}</div>
        </div>`).join("")}
      ${rx.advice ? `<div class="section-title">Advice</div><p style="font-size:14px">${rx.advice}</p>` : ""}
      ${rx.followUpDate ? `<div class="section-title">Follow-up</div><p style="font-size:14px">${new Date(rx.followUpDate).toLocaleDateString()}</p>` : ""}
      <div class="footer"><button onclick="window.print()">Print</button></div>
      <script>setTimeout(()=>window.print(),300)</script>
      </body></html>`);
    w.document.close();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Prescription #{rx.id}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-4 h-4" />
              <span className="font-medium text-foreground">{rx.patientName}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Stethoscope className="w-4 h-4" />
              <span className="font-medium text-foreground">Dr. {rx.doctorName}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{new Date(rx.createdAt).toLocaleDateString()}</span>
            </div>
            {rx.followUpDate && (
              <div className="text-sm text-muted-foreground">
                Follow-up: <span className="font-medium text-foreground">{new Date(rx.followUpDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {rx.symptoms && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Symptoms</p>
              <p className="text-sm">{rx.symptoms}</p>
            </div>
          )}
          {rx.diagnosis && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Diagnosis</p>
              <p className="text-sm font-semibold">{rx.diagnosis}</p>
            </div>
          )}

          <Separator />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
              <Pill className="w-3.5 h-3.5" /> Medicines ({rx.medicines?.length || 0})
            </p>
            <div className="space-y-2">
              {(rx.medicines || []).map((m: any, i: number) => (
                <div key={i} className="rounded-lg border bg-muted/30 p-3">
                  <div className="font-semibold text-sm">{i + 1}. {m.name} <span className="text-muted-foreground font-normal">— {m.dosage}</span></div>
                  <div className="text-xs text-muted-foreground mt-1">{m.timing} · {m.duration}{m.instructions ? ` · ${m.instructions}` : ""}</div>
                </div>
              ))}
            </div>
          </div>

          {rx.advice && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Advice</p>
                <p className="text-sm">{rx.advice}</p>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handlePrint}>Print Prescription</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Prescriptions() {
  const queryClient = useQueryClient();
  const [newOpen, setNewOpen] = useState(false);
  const [viewRx, setViewRx] = useState<any>(null);

  const { data, isLoading } = useListPrescriptions(
    {},
    { query: { queryKey: getListPrescriptionsQueryKey({}) } }
  );

  function invalidate() { queryClient.invalidateQueries({ queryKey: getListPrescriptionsQueryKey() }); }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Prescriptions</h1>
            <p className="text-muted-foreground mt-2">Manage medical prescriptions across the hospital</p>
          </div>
          <Button className="gap-2" onClick={() => setNewOpen(true)}>
            <Plus className="w-4 h-4" /> New Prescription
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Diagnosis</TableHead>
                  <TableHead>Medicines</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading prescriptions...</TableCell></TableRow>
                ) : data?.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No prescriptions found</TableCell></TableRow>
                ) : data?.map((rx) => (
                  <TableRow key={rx.id}>
                    <TableCell className="font-medium text-muted-foreground">#{rx.id}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(rx.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{rx.patientName}</TableCell>
                    <TableCell>Dr. {rx.doctorName}</TableCell>
                    <TableCell className="truncate max-w-[160px]">{rx.diagnosis || "-"}</TableCell>
                    <TableCell>
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{rx.medicines?.length || 0} med{(rx.medicines?.length ?? 0) !== 1 ? "s" : ""}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setViewRx(rx)}>View</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <NewPrescriptionDialog open={newOpen} onClose={() => setNewOpen(false)} onSuccess={invalidate} />
      <ViewPrescriptionDialog rx={viewRx} open={!!viewRx} onClose={() => setViewRx(null)} />
    </DashboardLayout>
  );
}
