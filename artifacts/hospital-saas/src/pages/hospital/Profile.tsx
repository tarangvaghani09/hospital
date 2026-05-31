import { useGetHospitalProfile, getGetHospitalProfileQueryKey, useUpdateHospitalProfile } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useRef } from "react";

const normalize = (v: string) => v.trim().replace(/\s+/g, " ");
const optionalText = z.string().optional().or(z.literal("")).transform((v) => normalize(v ?? ""));

const profileSchema = z.object({
  name: z.string()
    .transform(normalize)
    .refine((v) => v.length >= 2, "Hospital name must be at least 2 characters")
    .refine((v) => v.length <= 100, "Hospital name must be at most 100 characters")
    .refine((v) => !/^\d+$/.test(v), "Hospital name cannot be only numbers"),
  email: optionalText.refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Please enter a valid email address"),
  phone: optionalText
    .refine((v) => v === "" || /^\d+$/.test(v), "Primary phone must contain digits only")
    .refine((v) => v === "" || v.length <= 10, "Primary phone cannot be more than 10 digits"),
  emergencyPhone: optionalText
    .refine((v) => v === "" || /^\d+$/.test(v), "Emergency contact must contain digits only")
    .refine((v) => v === "" || v.length <= 10, "Emergency contact cannot be more than 10 digits"),
  address: optionalText.refine((v) => v === "" || !/^\d+$/.test(v), "Address cannot be only numbers"),
  registrationNumber: optionalText,
  gstNumber: optionalText,
  websiteUrl: optionalText.refine(
    (v) => v === "" || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(v),
    "Please enter a valid website URL (http:// or https://)"
  ),
});

export function HospitalProfile() {
  const { toast } = useToast();
  const { data: profile, isLoading } = useGetHospitalProfile(
    { query: { queryKey: getGetHospitalProfileQueryKey() } }
  );
  
  const updateMutation = useUpdateHospitalProfile();

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      emergencyPhone: "",
      address: "",
      registrationNumber: "",
      gstNumber: "",
      websiteUrl: "",
    },
  });

  const initialized = useRef(false);

  useEffect(() => {
    if (profile && !initialized.current) {
      form.reset({
        name: profile.name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        emergencyPhone: profile.emergencyPhone || "",
        address: profile.address || "",
        registrationNumber: profile.registrationNumber || "",
        gstNumber: profile.gstNumber || "",
        websiteUrl: profile.websiteUrl || "",
      });
      initialized.current = true;
    }
  }, [profile, form]);

  function onSubmit(values: z.infer<typeof profileSchema>) {
    updateMutation.mutate(
      { data: values },
      {
        onSuccess: () => {
          toast({
            title: "Profile updated",
            description: "Hospital profile details have been saved successfully.",
          });
        },
        onError: (error: any) => {
          toast({
            variant: "destructive",
            title: "Update failed",
            description: error.message || "Failed to save profile.",
          });
        }
      }
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 max-w-3xl">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-[500px] w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl pb-6 sm:pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hospital Profile</h1>
          <p className="text-muted-foreground mt-2">Manage your facility's public information and contact details</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
            <CardDescription>These details are displayed on invoices and patient communications.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hospital Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="registrationNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registration Number</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Phone</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">+91-</span>
                            <Input
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
                              inputMode="numeric"
                              maxLength={10}
                              className="pl-12"
                              placeholder="XXXXXXXXXX"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="emergencyPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Emergency Contact</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">+91-</span>
                            <Input
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
                              inputMode="numeric"
                              maxLength={10}
                              className="pl-12"
                              placeholder="XXXXXXXXXX"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="websiteUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Address</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end pt-4 border-t">
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
