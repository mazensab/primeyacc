"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  AudioLines,
  Coins,
  Download,
  Pause,
  Play,
  RotateCcw,
  Share2,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle
} from "@/components/ui/drawer";

const MAX_CHARS = 5000;
const BAR_COUNT = 64;
const AUDIO_SRC = "/audio/tts-sample.m4a";

const voices = [
  { id: "james", name: "James", tag: "Narrative & Story", color: "bg-emerald-500" },
  { id: "alice", name: "Alice", tag: "Warm & Friendly", color: "bg-sky-500" },
  { id: "mia", name: "Mia", tag: "News & Podcast", color: "bg-violet-500" },
  { id: "leo", name: "Leo", tag: "Energetic Ads", color: "bg-amber-500" }
];

const models = ["Vernal Multilingual v2", "Vernal Turbo v2.5", "Vernal English v1"];

const defaultSettings = { speed: 90, stability: 20, similarity: 60, style: 0, boost: true };

// Placeholder heights until the real audio is decoded; deterministic so server
// and client render the same waveform
const placeholderBars = Array.from({ length: BAR_COUNT }, (_, i) => {
  const n = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
  return 15 + Math.round(n * 80);
});

type Generation = {
  id: string;
  snippet: string;
  voiceId: string;
  model: string;
  duration: number;
  size: string;
};

const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

function AdjustmentSlider({
  label,
  value,
  onChange,
  left,
  right
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  left: string;
  right: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-muted-foreground text-xs tabular-nums">{value}%</span>
      </div>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} max={100} step={1} />
      <div className="text-muted-foreground flex justify-between text-xs">
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}

const defaultText =
  "From ancient tools to modern tech, product design has shaped the way we live, work, and play. But how did we get here? Who were the pioneers that revolutionized the way we interact with the world? In this video, we're diving into the fascinating history of product design, exploring the movements, innovations, and game changing moments that brought us everything from minimalist furniture to cutting edge gadgets. Let's take a journey through time and see how design has evolved to shape our everyday lives!";

export default function TextToSpeechApp() {
  const [text, setText] = React.useState(defaultText);
  const [tab, setTab] = React.useState("settings");
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [voiceId, setVoiceId] = React.useState(voices[0].id);
  const [model, setModel] = React.useState(models[0]);
  const [settings, setSettings] = React.useState(defaultSettings);
  const [credits, setCredits] = React.useState(110_000);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generations, setGenerations] = React.useState<Generation[]>([]);
  const [current, setCurrent] = React.useState<Generation | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [time, setTime] = React.useState(0);
  const [bars, setBars] = React.useState<number[]>(placeholderBars);
  const [audioDuration, setAudioDuration] = React.useState<number | null>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  const currentVoice = voices.find((v) => v.id === current?.voiceId) ?? voices[0];
  const duration = audioDuration ?? current?.duration ?? 0;

  // Decode the recording once and turn its real amplitude peaks into bar heights
  React.useEffect(() => {
    let cancelled = false;
    const ctx = new AudioContext();
    fetch(AUDIO_SRC)
      .then((res) => res.arrayBuffer())
      .then((buffer) => ctx.decodeAudioData(buffer))
      .then((audio) => {
        if (cancelled) return;
        const data = audio.getChannelData(0);
        const binSize = Math.floor(data.length / BAR_COUNT);
        const peaks = Array.from({ length: BAR_COUNT }, (_, i) => {
          let peak = 0;
          for (let j = i * binSize; j < (i + 1) * binSize; j += 16) {
            const value = Math.abs(data[j]);
            if (value > peak) peak = value;
          }
          return peak;
        });
        const maxPeak = Math.max(...peaks) || 1;
        setBars(peaks.map((peak) => 10 + Math.round((peak / maxPeak) * 88)));
        setAudioDuration(audio.duration);
      })
      .catch(() => {})
      .finally(() => ctx.close());
    return () => {
      cancelled = true;
    };
  }, []);

  // Smooth bar-by-bar progress from the actual playback position
  React.useEffect(() => {
    if (!isPlaying) return;
    let frame: number;
    const step = () => {
      const el = audioRef.current;
      if (el) setTime(el.currentTime);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying]);

  // The Speed slider drives the real playback rate
  React.useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = 0.75 + (settings.speed / 100) * 0.5;
  }, [settings.speed]);

  const restartPlayback = () => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = 0;
    setTime(0);
    el.play();
  };

  const seekTo = (value: number) => {
    const el = audioRef.current;
    if (el) el.currentTime = value;
    setTime(value);
  };

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
    } else {
      if (time >= duration) el.currentTime = 0;
      el.play();
    }
  };

  const handleGenerate = () => {
    if (!text.trim()) {
      toast.error("Please enter some text to generate speech.");
      return;
    }
    setIsGenerating(true);
    setTimeout(() => {
      const generation: Generation = {
        id: Date.now().toString(),
        snippet: text.trim(),
        voiceId,
        model,
        duration: audioDuration ?? 30,
        size: `${Math.max((audioDuration ?? 30) * 0.043, 0.1).toFixed(1)} MB`
      };
      setGenerations((prev) => [generation, ...prev]);
      setCurrent(generation);
      setCredits((c) => Math.max(0, c - text.trim().length));
      setIsGenerating(false);
      restartPlayback();
      toast.success("Speech generated successfully.");
    }, 1600);
  };

  const loadGeneration = (generation: Generation) => {
    setCurrent(generation);
    restartPlayback();
  };

  const settingsPanel = (
    <Tabs value={tab} onValueChange={setTab} className="gap-4">
      <TabsList className="w-full">
        <TabsTrigger value="settings">Settings</TabsTrigger>
        <TabsTrigger value="history">
          History
          {generations.length > 0 && (
            <Badge variant="secondary" className="rounded-full px-1.5 tabular-nums">
              {generations.length}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="settings" className="space-y-6">
        <div className="space-y-2">
          <Label>Voice</Label>
          <Select value={voiceId} onValueChange={setVoiceId}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {voices.map((voice) => (
                <SelectItem key={voice.id} value={voice.id}>
                  <span className={cn("size-2.5 rounded-full", voice.color)} />
                  {voice.name} - {voice.tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Model</Label>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {models.map((entry) => (
                <SelectItem key={entry} value={entry}>
                  {entry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div className="space-y-5">
          <h3 className="text-sm font-semibold">Voice adjustment</h3>
          <AdjustmentSlider
            label="Speed"
            value={settings.speed}
            onChange={(speed) => setSettings((s) => ({ ...s, speed }))}
            left="Slower"
            right="Faster"
          />
          <AdjustmentSlider
            label="Stability"
            value={settings.stability}
            onChange={(stability) => setSettings((s) => ({ ...s, stability }))}
            left="More variable"
            right="More stable"
          />
          <AdjustmentSlider
            label="Similarity"
            value={settings.similarity}
            onChange={(similarity) => setSettings((s) => ({ ...s, similarity }))}
            left="Low"
            right="High"
          />
          <AdjustmentSlider
            label="Style Exaggeration"
            value={settings.style}
            onChange={(style) => setSettings((s) => ({ ...s, style }))}
            left="None"
            right="Exaggerated"
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between gap-2">
          <Label className="gap-2">
            <Switch
              checked={settings.boost}
              onCheckedChange={(boost) => setSettings((s) => ({ ...s, boost }))}
            />
            Speaker Boost
          </Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSettings(defaultSettings);
              toast.success("Voice settings restored to defaults.");
            }}
          >
            <RotateCcw />
            Reset values
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="history">
        {generations.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-2 py-12 text-center text-sm">
            <AudioLines className="size-8 opacity-50" />
            No generations yet. Your generated audio will appear here.
          </div>
        ) : (
          <div className="space-y-2">
            {generations.map((generation) => {
              const voice = voices.find((v) => v.id === generation.voiceId) ?? voices[0];
              return (
                <button
                  key={generation.id}
                  onClick={() => loadGeneration(generation)}
                  className={cn(
                    "hover:bg-muted/50 w-full cursor-pointer rounded-lg border p-3 text-start transition-colors",
                    current?.id === generation.id && "border-primary/50 bg-muted/50"
                  )}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      <span className={cn("size-2 rounded-full", voice.color)} />
                      {voice.name}
                    </span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {formatTime(generation.duration)}
                    </span>
                  </div>
                  <p className="text-muted-foreground line-clamp-2 text-xs">{generation.snippet}</p>
                </button>
              );
            })}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );

  return (
    <div className="space-y-4 lg:space-y-6">
      <audio
        ref={audioRef}
        src={AUDIO_SRC}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setTime(duration)}
      />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Text to Speech</h1>
          <p className="text-muted-foreground text-sm">
            Convert text into natural sounding speech.
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="lg:hidden"
          onClick={() => setSettingsOpen(true)}
        >
          <SlidersHorizontal />
          <span className="sr-only">Settings</span>
        </Button>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
        <div className="space-y-4 lg:space-y-6">
          {/* Editor */}
          <Card>
            <CardContent>
              <Textarea
                placeholder="Describe what you want to say. Paste a script, a story, or any text up to 5,000 characters..."
                value={text}
                maxLength={MAX_CHARS}
                onChange={(e) => setText(e.target.value)}
                className="min-h-48 resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 md:text-base lg:min-h-64 dark:bg-transparent"
              />
              <div className="text-muted-foreground mt-2 text-end text-xs tabular-nums">
                {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()} characters
              </div>
            </CardContent>
            <CardFooter className="flex-wrap justify-between gap-2">
              <span className="text-muted-foreground flex items-center gap-2 text-sm">
                <Coins className="size-4" />
                <span className="tabular-nums">{credits.toLocaleString()}</span> credits remaining
              </span>
              <div className="flex gap-2">
                <Button onClick={handleGenerate} disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles />
                      Generate speech
                    </>
                  )}
                </Button>
              </div>
            </CardFooter>
          </Card>

          {/* Player */}
          {current && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex size-10 items-center justify-center rounded-full text-sm font-semibold text-white",
                      currentVoice.color
                    )}
                  >
                    {currentVoice.name[0]}
                  </div>
                  <div>
                    <CardTitle>
                      {currentVoice.name} - {currentVoice.tag}
                    </CardTitle>
                    <p className="text-muted-foreground text-xs">
                      {isPlaying ? "Playing" : "Paused"} · {formatTime(time)}/{formatTime(duration)}
                    </p>
                  </div>
                </div>
                <CardAction>
                  <Badge variant="secondary">MP3 · {current.size}</Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Waveform */}
                <div className="relative flex h-19 items-center">
                  {bars.map((height, i) => (
                    <button
                      key={i}
                      aria-label={`Seek to ${formatTime((i / BAR_COUNT) * duration)}`}
                      onClick={() => seekTo((i / BAR_COUNT) * duration)}
                      className="group/bar flex h-full min-w-0 flex-1 cursor-pointer items-center justify-center"
                    >
                      <span
                        className="bg-muted-foreground/25 group-hover/bar:bg-muted-foreground/40 w-1.5 rounded-full transition-colors"
                        style={{ height: `${height}%` }}
                      />
                    </button>
                  ))}
                  {/* Progress overlay sweeping continuously over the same bars */}
                  <div
                    className="pointer-events-none absolute inset-0 flex items-center transition-[clip-path] duration-150 ease-linear"
                    style={{
                      clipPath: `inset(0 ${100 - (duration > 0 ? (time / duration) * 100 : 0)}% 0 0)`
                    }}
                  >
                    {bars.map((height, i) => (
                      <span
                        key={i}
                        className="flex h-full min-w-0 flex-1 items-center justify-center"
                      >
                        <span
                          className="bg-primary w-1.5 rounded-full"
                          style={{ height: `${height}%` }}
                        />
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-center">
                  <span className="font-display text-2xl tabular-nums">{formatTime(time)}</span>
                  <span className="text-muted-foreground font-display text-2xl tabular-nums">
                    /{formatTime(duration)}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="flex-wrap justify-between gap-3">
                <div className="text-muted-foreground hidden text-sm sm:block">Voice Generated</div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    onClick={() => seekTo(Math.max(0, time - 5))}
                  >
                    <SkipBack />
                  </Button>
                  <Button size="icon-lg" className="rounded-full" onClick={togglePlay}>
                    {isPlaying ? <Pause /> : <Play />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    onClick={() => seekTo(Math.min(duration, time + 5))}
                  >
                    <SkipForward />
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toast.success("Share link copied to clipboard.")}
                  >
                    <Share2 />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toast.success("Download started.")}
                  >
                    <Download />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          )}
        </div>

        {/* Settings / History */}
        <Card className="hidden lg:block">
          <CardContent>{settingsPanel}</CardContent>
        </Card>

        <Drawer direction="right" open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DrawerContent className="w-full sm:max-w-md">
            <DrawerHeader className="border-b">
              <DrawerTitle>Settings</DrawerTitle>
              <DrawerDescription className="sr-only">
                Voice settings and generation history
              </DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto p-4">{settingsPanel}</div>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}
