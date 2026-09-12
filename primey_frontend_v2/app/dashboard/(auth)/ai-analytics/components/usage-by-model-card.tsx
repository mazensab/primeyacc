"use client";

import { useState } from "react";
import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

import { TimeRangeTabs } from "./time-range-tabs";

const models = [
  { name: "GPT-4o", slug: "openai" },
  { name: "Claude 3.5", slug: "claude" },
  { name: "Llama 3", slug: "ollama" },
  { name: "Gemini Pro", slug: "googlegemini" },
  { name: "DeepSeek", slug: "deepseek" },
  { name: "Grok", slug: "x" },
  { name: "Mistral", slug: "mistralai" },
  { name: "Perplexity", slug: "perplexity" },
  { name: "Qwen", slug: "alibabacloud" }
];

const tokensByRange: Record<string, number[]> = {
  All: [18200, 46800, 21300, 33600, 15400, 9800, 28700, 8600, 19800],
  "7d": [9200, 26400, 11600, 18400, 9100, 5200, 18100, 5100, 11400],
  "1m": [11800, 31200, 13900, 22800, 10600, 6400, 20500, 6800, 13100],
  "6m": [15600, 39400, 17800, 28900, 13200, 8100, 24600, 7900, 16700],
  "1y": [17400, 43600, 19600, 31800, 14500, 9200, 27100, 8300, 18400]
};

const avgByRange: Record<string, string> = {
  All: "22.5K",
  "7d": "5.42K",
  "1m": "8.9K",
  "6m": "16.2K",
  "1y": "19.9K"
};

const costByRange: Record<string, string> = {
  All: "412$",
  "7d": "23$",
  "1m": "76$",
  "6m": "218$",
  "1y": "364$"
};

const chartConfig = {
  tokens: {
    label: "Tokens",
    color: "var(--chart-3)"
  }
} satisfies ChartConfig;

// The OpenAI icon was removed from simple-icons v16, so it stays pinned to v15.
const iconVersions: Record<string, string> = { openai: "15" };

function ModelIcon({ slug, className }: { slug: string; className?: string }) {
  const version = iconVersions[slug] ?? "16";
  const url = `https://cdn.jsdelivr.net/npm/simple-icons@${version}/icons/${slug}.svg`;

  return (
    <span
      aria-hidden
      className={cn("bg-foreground inline-block size-full", className)}
      style={{
        WebkitMaskImage: `url(${url})`,
        maskImage: `url(${url})`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center"
      }}
    />
  );
}

type IconLabelProps = {
  x?: string | number;
  y?: string | number;
  width?: string | number;
  index?: number;
};

function ModelIconLabel({ x, y, width, index }: IconLabelProps) {
  const model = models[index ?? 0];
  const barX = Number(x ?? 0);
  const barY = Number(y ?? 0);
  const barWidth = Number(width ?? 0);
  const size = 18;

  return (
    <foreignObject
      x={barX + barWidth / 2 - size / 2}
      y={barY - size - 8}
      width={size}
      height={size}>
      <ModelIcon slug={model.slug} />
    </foreignObject>
  );
}

function formatTokens(value: number) {
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(value);
}

export function UsageByModelCard() {
  const [range, setRange] = useState("7d");
  const chartData = models.map((model, index) => ({
    ...model,
    tokens: tokensByRange[range][index]
  }));
  const total = chartData.reduce((sum, model) => sum + model.tokens, 0);
  const top = chartData.reduce((best, model) => (model.tokens > best.tokens ? model : best));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Usage by Model</CardTitle>
        <CardDescription>
          Avg {avgByRange[range]}{" "}
          <span className="text-foreground font-medium">({costByRange[range]})</span>
        </CardDescription>
        <CardAction>
          <TimeRangeTabs value={range} onValueChange={setRange} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ChartContainer config={chartConfig} className="aspect-auto h-[170px] w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{ top: 30, right: 10, bottom: 0, left: 0 }}>
            <XAxis dataKey="name" hide />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={36}
              domain={[0, 50_000]}
              ticks={[0, 10_000, 20_000, 30_000, 40_000, 50_000]}
              tickFormatter={formatTokens}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value) => (
                    <span className="font-medium tabular-nums">
                      {Number(value).toLocaleString("en-US")} tokens
                    </span>
                  )}
                />
              }
            />
            <Bar dataKey="tokens" fill="var(--chart-3)" radius={6} barSize={20}>
              <LabelList dataKey="tokens" content={<ModelIconLabel />} />
            </Bar>
          </BarChart>
        </ChartContainer>
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <span className="size-4 shrink-0">
            <ModelIcon slug={top.slug} />
          </span>
          {top.name}: {(top.tokens / 1_000).toFixed(1)}k tokens ({Math.round((top.tokens / total) * 100)}
          % of total volume)
        </p>
      </CardContent>
    </Card>
  );
}
