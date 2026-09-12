import { ChevronRight, FolderUp, MoreVerticalIcon } from "lucide-react";
import { format, parseISO } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const appointments = [
  {
    id: 1,
    patient: "John Swift",
    date: "2026-08-22",
    time: "10:00 AM",
    doctor: "Dr. Smith",
    department: "Cardiology"
  },
  {
    id: 2,
    patient: "Jane Smith",
    date: "2026-08-22",
    time: "11:30 AM",
    doctor: "Dr. Johnson",
    department: "Neurology"
  },
  {
    id: 3,
    patient: "Bob Wilson",
    date: "2026-08-23",
    time: "2:00 PM",
    doctor: "Dr. Brown",
    department: "Oncology"
  },
  {
    id: 4,
    patient: "Alice Taylor",
    date: "2026-08-24",
    time: "3:30 PM",
    doctor: "Dr. Davis",
    department: "Pediatrics"
  },
  {
    id: 5,
    patient: "Bill Galon",
    date: "2026-08-24",
    time: "2:30 PM",
    doctor: "Dr. Karen",
    department: "Neurology"
  },
  {
    id: 6,
    patient: "Mike Dall",
    date: "2026-08-25",
    time: "2:30 PM",
    doctor: "Dr. Karen",
    department: "Cardiology"
  },
  {
    id: 7,
    patient: "Emma Clark",
    date: "2026-08-26",
    time: "9:15 AM",
    doctor: "Dr. Brown",
    department: "Oncology"
  }
];

export function UpcomingAppointments() {
  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Upcoming Appointments</CardTitle>
        <CardAction>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <FolderUp /> <span className="hidden lg:inline">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Excel</DropdownMenuItem>
                <DropdownMenuItem>PDF</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="icon" aria-label="View all appointments">
              <ChevronRight />
            </Button>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col p-0 [&_[data-slot=table-container]]:flex-1">
        <Table className="min-w-[640px] [&_td:first-child]:ps-(--card-spacing) [&_td:last-child]:pe-(--card-spacing) [&_th:first-child]:ps-(--card-spacing) [&_th:last-child]:pe-(--card-spacing)">
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Department</TableHead>
              <TableHead className="w-14">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.map((appointment) => (
              <TableRow key={appointment.id}>
                <TableCell className="font-medium">{appointment.patient}</TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {format(parseISO(appointment.date), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap tabular-nums">
                  {appointment.time}
                </TableCell>
                <TableCell>{appointment.doctor}</TableCell>
                <TableCell className="text-muted-foreground">{appointment.department}</TableCell>
                <TableCell className="text-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon-sm" variant="ghost">
                        <span className="sr-only">Open menu</span>
                        <MoreVerticalIcon />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View</DropdownMenuItem>
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
