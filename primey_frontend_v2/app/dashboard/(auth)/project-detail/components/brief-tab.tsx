import { CheckIcon } from "lucide-react";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const deliverables = [
  "24 long-form articles (1,800+ words each) targeting commercial keywords",
  "SEO refresh of the 10 best performing existing posts",
  "12 internal-link clusters connecting new and existing content",
  "Monthly performance report with traffic, rankings and conversions"
];

const metrics = [
  "4x organic traffic by April 1 compared to the October baseline",
  "Top-3 ranking for 8 priority keywords",
  "15% of blog visitors reaching a product page",
  "50 demo requests attributed to blog content"
];

export function BriefTab() {
  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Project Brief</CardTitle>
        <CardAction>
          <span className="text-muted-foreground text-sm">Last updated Jan 24, 2026</span>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Objective</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Quadruple organic traffic to the Acme Cloud blog within 6 months by building a content
            engine around high-intent commercial keywords that competitors are ignoring. The blog
            should become a reliable pipeline source, not just a traffic channel.
          </p>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Target Audience</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            HR managers and people-ops leads at companies with 50 to 500 employees who are actively
            evaluating HR software. They search with clear buying intent, compare tools, and read
            practical guides before shortlisting vendors.
          </p>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Deliverables</h3>
          <ul className="space-y-2">
            {deliverables.map((item) => (
              <li key={item} className="text-muted-foreground flex items-start gap-2 text-sm">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-green-600" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Success Metrics</h3>
          <ul className="space-y-2">
            {metrics.map((item) => (
              <li key={item} className="text-muted-foreground flex items-start gap-2 text-sm">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-green-600" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
