import { useListSupportTickets, getListSupportTicketsQueryKey } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function SuperAdminTickets() {
  const { data, isLoading } = useListSupportTickets(
    {},
    { query: { queryKey: getListSupportTicketsQueryKey({}) } }
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
          <p className="text-muted-foreground mt-2">Manage support requests from hospital tenants</p>
        </div>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[760px] sm:min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket ID</TableHead>
                  <TableHead>Hospital</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading tickets...</TableCell>
                  </TableRow>
                ) : data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No support tickets found</TableCell>
                  </TableRow>
                ) : data?.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium text-muted-foreground">#{ticket.id}</TableCell>
                    <TableCell className="font-medium">{ticket.hospitalName || "Unknown"}</TableCell>
                    <TableCell>{ticket.subject}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        ticket.priority === 'HIGH' ? 'border-red-500 text-red-600' : 
                        ticket.priority === 'MEDIUM' ? 'border-amber-500 text-amber-600' : ''
                      }>
                        {ticket.priority || 'NORMAL'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        ticket.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                        ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                      }>
                        {ticket.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(ticket.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">View</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
