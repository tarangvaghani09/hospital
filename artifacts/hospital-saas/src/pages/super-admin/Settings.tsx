import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { CURRENCIES, getCurrencyCode, setCurrencyCode } from "@/lib/currency";
import { Globe } from "lucide-react";

export function SuperAdminSettings() {
  const { toast } = useToast();
  const [currency, setCurrencyState] = useState(getCurrencyCode);

  function handleSave() {
    setCurrencyCode(currency);
    toast({ title: "Settings saved", description: `Currency set to ${currency}` });
  }

  const selected = CURRENCIES.find(c => c.code === currency);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Settings</h1>
          <p className="text-muted-foreground mt-2">Global platform configuration</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" /> Regional Settings
            </CardTitle>
            <CardDescription>
              Choose the display currency for the Super Admin dashboard. Individual hospitals manage their own currency in their settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 max-w-full sm:max-w-xs">
              <label className="text-sm font-medium">Display Currency</label>
              <Select value={currency} onValueChange={setCurrencyState}>
                <SelectTrigger>
                  <SelectValue>
                    {selected ? (
                      <span className="flex items-center gap-2">
                        <span>{selected.flag}</span>
                        <span>{selected.symbol}</span>
                        <span>{selected.name}</span>
                        <span className="text-muted-foreground text-xs">({selected.code})</span>
                      </span>
                    ) : "Select currency"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-56 overflow-hidden">
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
              <p className="text-xs text-muted-foreground">
                Currently showing: <strong>{selected?.flag} {selected?.name} ({selected?.symbol})</strong>
              </p>
            </div>
            <div className="flex justify-start pt-2">
              <Button className="w-full sm:w-auto" onClick={handleSave}>Save Settings</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
