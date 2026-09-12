import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage
} from "@/components/ui/avatar";

const participantCount = 40;

const participants = [
  "https://i.pravatar.cc/150?img=32",
  "https://i.pravatar.cc/150?img=33",
  "https://i.pravatar.cc/150?img=34",
  "https://i.pravatar.cc/150?img=35"
];

export default function NextAgenda() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Next Agenda</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="font-medium">Monthly Evaluation</p>
          <p className="text-muted-foreground text-sm">Today, 08:30 AM – 10:30 AM</p>
        </div>
        <div className="flex items-center gap-3">
          <AvatarGroup>
            {participants.map((avatar, index) => (
              <Avatar key={avatar}>
                <AvatarImage src={avatar} alt={`Participant ${index + 1}`} />
                <AvatarFallback>P{index + 1}</AvatarFallback>
              </Avatar>
            ))}
            <AvatarGroupCount>+{participantCount - participants.length}</AvatarGroupCount>
          </AvatarGroup>
          <span className="text-muted-foreground text-sm">{participantCount} Participants</span>
        </div>
        <Button className="w-full">Join Meeting Now</Button>
      </CardContent>
    </Card>
  );
}
