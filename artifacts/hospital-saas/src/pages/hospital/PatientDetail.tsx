import { useGetPatientHistory, getGetPatientHistoryQueryKey } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams } from "wouter";
import { User, Phone, Mail, Droplet, Calendar, FileText, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function PatientDetail() {
  const params = useParams();
  const patientId = params.id ? parseInt(params.id) : 0;

  const { data: history, isLoading } = useGetPatientHistory(
    patientId,
    { query: { enabled: !!patientId, queryKey: getGetPatientHistoryQueryKey(patientId) } }
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-1/4" />
          <div className="grid gap-6 md:grid-cols-3">
            <Skeleton className="h-[200px]" />
            <Skeleton className="h-[200px] md:col-span-2" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!history?.patient) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold">Patient not found</h2>
        </div>
      </DashboardLayout>
    );
  }

  const { patient, appointments, prescriptions, invoices } = history;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{patient.name}</h1>
              <Badge variant="outline" className="bg-muted">{patient.patientId}</Badge>
            </div>
            <p className="text-muted-foreground mt-1">Patient Record & Medical History</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                  {patient.name.charAt(0)}
                </div>
              </div>
              
              <div className="space-y-3 pt-4 border-t">
                {patient.phone && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" /> Phone
                    </div>
                    <span className="font-medium">{patient.phone}</span>
                  </div>
                )}
                {patient.email && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4" /> Email
                    </div>
                    <span className="font-medium">{patient.email}</span>
                  </div>
                )}
                {patient.gender && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-4 h-4" /> Gender
                    </div>
                    <span className="font-medium">{patient.gender}</span>
                  </div>
                )}
                {patient.bloodGroup && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Droplet className="w-4 h-4" /> Blood Group
                    </div>
                    <Badge variant="secondary" className="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                      {patient.bloodGroup}
                    </Badge>
                  </div>
                )}
                {patient.dateOfBirth && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" /> DOB
                    </div>
                    <span className="font-medium">{new Date(patient.dateOfBirth).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="md:col-span-2">
            <Tabs defaultValue="appointments" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="appointments">Appointments ({appointments?.length || 0})</TabsTrigger>
                <TabsTrigger value="prescriptions">Prescriptions ({prescriptions?.length || 0})</TabsTrigger>
                <TabsTrigger value="invoices">Invoices ({invoices?.length || 0})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="appointments" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Appointment History</CardTitle>
                    <CardDescription>Past and upcoming visits</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {appointments?.length ? appointments.map(apt => (
                        <div key={apt.id} className="flex justify-between items-start p-4 border rounded-lg">
                          <div>
                            <div className="font-medium">{new Date(apt.appointmentDate).toLocaleDateString()} at {apt.appointmentTime}</div>
                            <div className="text-sm text-muted-foreground mt-1">Dr. {apt.doctorName} • {apt.departmentName}</div>
                            {apt.symptoms && <div className="text-sm mt-2"><span className="font-medium">Symptoms:</span> {apt.symptoms}</div>}
                          </div>
                          <Badge variant="outline" className={
                            apt.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200' :
                            apt.status === 'SCHEDULED' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''
                          }>{apt.status}</Badge>
                        </div>
                      )) : <div className="text-center py-6 text-muted-foreground">No appointments found</div>}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="prescriptions" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Medical Prescriptions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {prescriptions?.length ? prescriptions.map(rx => (
                        <div key={rx.id} className="p-4 border rounded-lg space-y-3">
                          <div className="flex justify-between items-center border-b pb-2">
                            <div>
                              <div className="font-medium">{new Date(rx.createdAt).toLocaleDateString()}</div>
                              <div className="text-sm text-muted-foreground">By Dr. {rx.doctorName}</div>
                            </div>
                            <Badge variant="secondary">Rx #{rx.id}</Badge>
                          </div>
                          {rx.diagnosis && (
                            <div>
                              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Diagnosis</div>
                              <div className="text-sm">{rx.diagnosis}</div>
                            </div>
                          )}
                          <div>
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Medicines</div>
                            <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                              {rx.medicines?.map((med, i) => (
                                <li key={i}><span className="font-medium">{med.name}</span> — {med.dosage} ({med.timing}) for {med.duration}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )) : <div className="text-center py-6 text-muted-foreground">No prescriptions found</div>}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="invoices" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Billing History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {invoices?.length ? invoices.map(inv => (
                        <div key={inv.id} className="flex justify-between items-center p-4 border rounded-lg">
                          <div>
                            <div className="font-medium">{inv.invoiceNumber}</div>
                            <div className="text-sm text-muted-foreground">{new Date(inv.createdAt || '').toLocaleDateString()}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">${inv.totalAmount.toLocaleString()}</div>
                            <Badge variant="outline" className={`mt-1 ${
                              inv.status === 'PAID' ? 'bg-green-50 text-green-700 border-green-200' :
                              inv.status === 'UNPAID' ? 'bg-red-50 text-red-700 border-red-200' : ''
                            }`}>{inv.status}</Badge>
                          </div>
                        </div>
                      )) : <div className="text-center py-6 text-muted-foreground">No invoices found</div>}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
