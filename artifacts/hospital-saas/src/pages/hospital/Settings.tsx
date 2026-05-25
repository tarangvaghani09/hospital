import { useGetHospitalSettings, getGetHospitalSettingsQueryKey, useUpdateHospitalSettings } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useRef } from "react";
import { CURRENCIES, setCurrencyCode } from "@/lib/currency";

const settingsSchema = z.object({
  invoicePrefix: z.string().optional(),
  taxEnabled: z.boolean().default(false),
  defaultTaxPercentage: z.coerce.number().optional(),
  discountEnabled: z.boolean().default(false),
  currency: z.string().default("INR"),
  calendarSlotDuration: z.coerce.number().min(5).max(120).default(15),
  allowMultiplePatientsPerSlot: z.boolean().default(false),
  allowDoctorViewOwnBilling: z.boolean().default(true),
  open24Hours: z.boolean().default(false),
  hospitalOpenTime: z.string().default("08:00"),
  hospitalCloseTime: z.string().default("20:00"),
});

export function HospitalSettings() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useGetHospitalSettings(
    { query: { queryKey: getGetHospitalSettingsQueryKey() } }
  );
  const s = settings as any;
  const updateMutation = useUpdateHospitalSettings();

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      invoicePrefix: "INV-",
      taxEnabled: false,
      defaultTaxPercentage: 0,
      discountEnabled: false,
      currency: "INR",
      calendarSlotDuration: 15,
      allowMultiplePatientsPerSlot: false,
      allowDoctorViewOwnBilling: true,
      open24Hours: false,
      hospitalOpenTime: "08:00",
      hospitalCloseTime: "20:00",
    },
  });

  const initialized = useRef(false);
  const open24Hours = useWatch({ control: form.control, name: "open24Hours" });

  useEffect(() => {
    if (s && !initialized.current) {
      const isOpen24 = s.hospitalOpenTime === "00:00" && s.hospitalCloseTime === "23:59";
      form.reset({
        invoicePrefix: s.invoicePrefix || "INV-",
        taxEnabled: s.taxEnabled || false,
        defaultTaxPercentage: s.defaultTaxPercentage || 0,
        discountEnabled: s.discountEnabled || false,
        currency: s.currency || "INR",
        calendarSlotDuration: s.calendarSlotDuration || 15,
        allowMultiplePatientsPerSlot: s.allowMultiplePatientsPerSlot || false,
        allowDoctorViewOwnBilling: s.allowDoctorViewOwnBilling !== false,
        open24Hours: isOpen24,
        hospitalOpenTime: isOpen24 ? "08:00" : (s.hospitalOpenTime || "08:00"),
        hospitalCloseTime: isOpen24 ? "20:00" : (s.hospitalCloseTime || "20:00"),
      });
      initialized.current = true;
    }
  }, [s, form]);

  function onSubmit(values: z.infer<typeof settingsSchema>) {
    const payload = {
      ...values,
      hospitalOpenTime: values.open24Hours ? "00:00" : values.hospitalOpenTime,
      hospitalCloseTime: values.open24Hours ? "23:59" : values.hospitalCloseTime,
    };
    updateMutation.mutate(
      { data: payload as any },
      {
        onSuccess: () => {
          setCurrencyCode(values.currency);
          toast({ title: "Settings updated", description: "Hospital settings have been saved successfully." });
        },
        onError: (error: any) => toast({ variant: "destructive", title: "Update failed", description: error.message || "Failed to save settings." }),
      }
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 max-w-3xl">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground mt-2">Configure operational rules and defaults</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Billing */}
            <Card>
              <CardHeader>
                <CardTitle>Billing &amp; Invoices</CardTitle>
                <CardDescription>Set defaults for generated invoices</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control} name="invoicePrefix"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Prefix</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control} name="defaultTaxPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Tax %</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="space-y-4 pt-2">
                  <FormField
                    control={form.control} name="taxEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enable Tax</FormLabel>
                          <FormDescription>Allow adding tax to invoice items</FormDescription>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control} name="discountEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enable Discounts</FormLabel>
                          <FormDescription>Allow receptionists to apply discounts</FormDescription>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Calendar & Scheduling */}
            <Card>
              <CardHeader>
                <CardTitle>Calendar &amp; Scheduling</CardTitle>
                <CardDescription>Control appointment booking hours and slot behavior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control} name="open24Hours"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base font-semibold">Open 24 / 7</FormLabel>
                        <FormDescription>Hospital accepts appointments at any hour</FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(v) => {
                            field.onChange(v);
                            if (v) {
                              form.setValue("hospitalOpenTime", "00:00");
                              form.setValue("hospitalCloseTime", "23:59");
                            } else {
                              form.setValue("hospitalOpenTime", "08:00");
                              form.setValue("hospitalCloseTime", "20:00");
                            }
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity ${open24Hours ? "opacity-40 pointer-events-none" : ""}`}>
                  <FormField
                    control={form.control} name="hospitalOpenTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hospital Open Time</FormLabel>
                        <FormControl><Input type="time" {...field} disabled={open24Hours} /></FormControl>
                        <FormDescription>Earliest time appointments can be booked</FormDescription>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control} name="hospitalCloseTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hospital Close Time</FormLabel>
                        <FormControl><Input type="time" {...field} disabled={open24Hours} /></FormControl>
                        <FormDescription>Latest time appointments can be booked</FormDescription>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control} name="calendarSlotDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Slot Duration (minutes)</FormLabel>
                      <FormControl><Input type="number" {...field} className="max-w-[200px]" /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control} name="allowMultiplePatientsPerSlot"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Overbooking</FormLabel>
                        <FormDescription>Allow multiple appointments in the same time slot</FormDescription>
                      </div>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Regional / Currency */}
            <Card>
              <CardHeader>
                <CardTitle>Regional Settings</CardTitle>
                <CardDescription>Choose the currency displayed across invoices, dashboards, and reports. This setting is saved to the database.</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control} name="currency"
                  render={({ field }) => (
                    <FormItem className="max-w-xs">
                      <FormLabel>Currency</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CURRENCIES.map(c => (
                            <SelectItem key={c.code} value={c.code}>
                              <span className="flex items-center gap-2">
                                <span>{c.flag}</span>
                                <span>{c.symbol}</span>
                                <span>{c.name}</span>
                                <span className="text-muted-foreground text-xs">({c.code})</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Currency is applied globally to all invoices and reports</FormDescription>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Permissions */}
            <Card>
              <CardHeader><CardTitle>Permissions</CardTitle></CardHeader>
              <CardContent>
                <FormField
                  control={form.control} name="allowDoctorViewOwnBilling"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Doctor Billing Visibility</FormLabel>
                        <FormDescription>Allow doctors to view their own generated revenue</FormDescription>
                      </div>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}
