import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/lib/auth";
import { useLogin } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Stethoscope, ArrowRight, ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

const ROLES = ["Super Admin", "Hospital Admin", "Doctor", "Receptionist"];

export function StaffLogin() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: z.infer<typeof loginSchema>) {
    loginMutation.mutate({ data: values }, {
      onSuccess: (data) => {
        login(data.token, data.user);
        toast({ title: "Welcome back", description: `Signed in as ${data.user.name}.` });
        switch (data.user.role) {
          case "SUPER_ADMIN": setLocation("/super-admin/dashboard"); break;
          case "HOSPITAL_ADMIN": setLocation("/hospital/dashboard"); break;
          case "DOCTOR": setLocation("/doctor/dashboard"); break;
          case "RECEPTIONIST": setLocation("/receptionist/dashboard"); break;
          case "PATIENT": setLocation("/patient/dashboard"); break;
          default: setLocation("/");
        }
      },
      onError: (error: any) => {
        toast({ variant: "destructive", title: "Sign in failed", description: error.message || "Invalid credentials." });
      },
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4">
            <span className="text-3xl font-bold">M</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">MediCore</h1>
          <p className="text-muted-foreground mt-1">Staff &amp; Admin Portal</p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Stethoscope className="w-4 h-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Staff Sign In</CardTitle>
                <CardDescription>For hospital staff and platform admins</CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ROLES.map(r => (
                <Badge key={r} variant="secondary" className="text-xs font-normal">{r}</Badge>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control} name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work Email</FormLabel>
                      <FormControl><Input placeholder="name@hospital.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control} name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full mt-2 gap-2" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? "Signing in..." : "Sign In to Portal"}
                  {!loginMutation.isPending && <ArrowRight className="w-4 h-4" />}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="border-t pt-5">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
              <ChevronLeft className="w-3.5 h-3.5" /> Back to Patient Login
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
