import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const activities = [
  {
    user: "Priya Patel",
    avatar: "https://i.pravatar.cc/150?img=15",
    action: 'submitted "10 Best Practices for HR Onboarding" for review',
    time: "2 hours ago"
  },
  {
    user: "Andika",
    avatar: "https://i.pravatar.cc/150?img=12",
    action: "updated the project progress to 68%",
    time: "5 hours ago"
  },
  {
    user: "Marcus Rivera",
    avatar: "https://i.pravatar.cc/150?img=8",
    action: 'commented on "Employee Retention Metrics" SEO refresh',
    time: "Yesterday"
  },
  {
    user: "Priya Patel",
    avatar: "https://i.pravatar.cc/150?img=15",
    action: 'published "Payroll Compliance Checklist"',
    time: "2 days ago"
  },
  {
    user: "Sarah Chen",
    avatar: "https://i.pravatar.cc/150?img=5",
    action: "approved the mid-project review agenda",
    time: "3 days ago"
  },
  {
    user: "Andika",
    avatar: "https://i.pravatar.cc/150?img=12",
    action: "mapped 2 new internal-link clusters",
    time: "4 days ago"
  }
];

export function ActivityTab() {
  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Activity</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div className="divide-y">
          {activities.map((activity, index) => (
            <div key={index} className="flex items-center gap-3 py-3 px-4 first:pt-0 last:pb-0">
              <Avatar className="size-8 shrink-0">
                <AvatarImage src={activity.avatar} alt={activity.user} />
                <AvatarFallback>{activity.user.charAt(0)}</AvatarFallback>
              </Avatar>
              <p className="min-w-0 text-sm">
                <span className="font-medium">{activity.user}</span>{" "}
                <span className="text-muted-foreground">{activity.action}</span>
              </p>
              <span className="text-muted-foreground ms-auto shrink-0 text-xs">
                {activity.time}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
