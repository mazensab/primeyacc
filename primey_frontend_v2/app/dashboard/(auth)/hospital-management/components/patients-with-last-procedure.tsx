import { format, parseISO } from "date-fns";
import { ChevronRight } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const patients = [
  {
    id: 1,
    name: "Olivia Martin",
    avatar: `https://i.pravatar.cc/150?img=1`,
    email: "olivia.martin@email.com",
    lastProcedure: "Appendectomy",
    date: "2025-05-20"
  },
  {
    id: 2,
    name: "Jackson Lee",
    avatar: `https://i.pravatar.cc/150?img=2`,
    email: "jackson.lee@email.com",
    lastProcedure: "Knee Arthroscopy",
    date: "2025-05-18"
  },
  {
    id: 3,
    name: "Isabella Nguyen",
    avatar: `https://i.pravatar.cc/150?img=3`,
    email: "isabella.nguyen@email.com",
    lastProcedure: "Cataract Surgery",
    date: "2025-05-15"
  },
  {
    id: 4,
    name: "William Chen",
    avatar: `https://i.pravatar.cc/150?img=4`,
    email: "william.chen@email.com",
    lastProcedure: "Colonoscopy",
    date: "2025-05-12"
  },
  {
    id: 5,
    name: "Can Jackson",
    avatar: `https://i.pravatar.cc/150?img=5`,
    email: "can.jackson@email.com",
    lastProcedure: "Colonoscopy",
    date: "2025-08-12"
  },
  {
    id: 6,
    name: "Sophia Ramirez",
    avatar: `https://i.pravatar.cc/150?img=6`,
    email: "sophia.ramirez@email.com",
    lastProcedure: "Gallbladder Removal",
    date: "2025-09-03"
  }
];

export function PatientsWithLastProcedure() {
  return (
    <Card className="col-span-3">
      <CardHeader className="relative">
        <CardTitle>Patients with Last Procedure</CardTitle>
        <CardAction>
          <Button variant="outline" size="sm">
            View All <ChevronRight />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          {patients.map((patient) => (
            <div key={patient.id} className="flex items-center">
              <Avatar className="shrink-0">
                <AvatarImage src={patient.avatar} alt="Avatar" />
                <AvatarFallback>
                  {patient.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="ml-3 min-w-0 space-y-1">
                <p className="truncate leading-none font-medium">{patient.name}</p>
                <p className="text-muted-foreground truncate text-sm">{patient.email}</p>
              </div>
              <div className="ml-auto shrink-0 space-y-1 ps-3 text-end font-medium">
                <p className="text-sm whitespace-nowrap">{patient.lastProcedure}</p>
                <p className="text-muted-foreground text-sm whitespace-nowrap">
                  {format(parseISO(patient.date), "MMM d, yyyy")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
