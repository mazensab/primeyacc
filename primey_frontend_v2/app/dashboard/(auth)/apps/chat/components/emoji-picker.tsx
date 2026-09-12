"use client";

import { useState } from "react";
import { Search } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type EmojiEntry = [emoji: string, keywords: string];

const EMOJI_CATEGORIES: { id: string; label: string; icon: string; emojis: EmojiEntry[] }[] = [
  {
    id: "smileys",
    label: "Smileys",
    icon: "😀",
    emojis: [
      ["😀", "grinning happy smile"],
      ["😃", "smiley happy open mouth"],
      ["😄", "smile joy laugh"],
      ["😁", "grin beam"],
      ["😆", "laughing squint haha"],
      ["😅", "sweat smile relief"],
      ["😂", "joy tears laugh"],
      ["🤣", "rofl rolling laugh"],
      ["🙂", "slight smile"],
      ["😉", "wink"],
      ["😊", "blush smile happy"],
      ["😇", "innocent angel halo"],
      ["🥰", "love hearts adore"],
      ["😍", "heart eyes love"],
      ["🤩", "star struck wow"],
      ["😘", "kiss love"],
      ["😋", "yum tongue tasty"],
      ["😜", "winking tongue crazy"],
      ["🤪", "zany crazy wild"],
      ["😎", "cool sunglasses"],
      ["🥳", "party celebrate birthday"],
      ["😏", "smirk"],
      ["😢", "cry sad tear"],
      ["😭", "sob cry loud"],
      ["😤", "huff triumph frustrated"],
      ["😡", "angry rage mad"],
      ["🤯", "mind blown exploding head"],
      ["😱", "scream fear shock"],
      ["😴", "sleep zzz tired"],
      ["🤤", "drool"],
      ["🙄", "eye roll"],
      ["😬", "grimace awkward"],
      ["🤔", "thinking hmm"],
      ["🤗", "hug"],
      ["🫡", "salute respect"],
      ["🤫", "shush quiet secret"]
    ]
  },
  {
    id: "gestures",
    label: "Gestures",
    icon: "👍",
    emojis: [
      ["👍", "thumbs up like yes"],
      ["👎", "thumbs down dislike no"],
      ["👌", "ok perfect"],
      ["🤌", "pinched fingers italian"],
      ["✌️", "victory peace"],
      ["🤞", "crossed fingers luck"],
      ["🤟", "love you gesture"],
      ["🤘", "rock horns metal"],
      ["🤙", "call me shaka"],
      ["👈", "point left"],
      ["👉", "point right"],
      ["👆", "point up"],
      ["👇", "point down"],
      ["☝️", "index up one"],
      ["👋", "wave hello bye"],
      ["🤚", "raised back hand"],
      ["🖐️", "hand fingers splayed"],
      ["✋", "raised hand stop high five"],
      ["🖖", "vulcan spock"],
      ["👏", "clap applause"],
      ["🙌", "raised hands celebrate praise"],
      ["🤝", "handshake deal agreement"],
      ["🙏", "pray please thanks"],
      ["💪", "muscle strong flex"],
      ["🫶", "heart hands love"],
      ["✍️", "writing hand"]
    ]
  },
  {
    id: "nature",
    label: "Nature",
    icon: "🐶",
    emojis: [
      ["🐶", "dog puppy"],
      ["🐱", "cat kitten"],
      ["🐭", "mouse"],
      ["🐹", "hamster"],
      ["🐰", "rabbit bunny"],
      ["🦊", "fox"],
      ["🐻", "bear"],
      ["🐼", "panda"],
      ["🐨", "koala"],
      ["🐯", "tiger"],
      ["🦁", "lion"],
      ["🐮", "cow"],
      ["🐷", "pig"],
      ["🐸", "frog"],
      ["🐵", "monkey"],
      ["🐔", "chicken"],
      ["🐧", "penguin"],
      ["🦄", "unicorn"],
      ["🐝", "bee honeybee"],
      ["🦋", "butterfly"],
      ["🌸", "cherry blossom flower"],
      ["🌹", "rose flower"],
      ["🌻", "sunflower"],
      ["🌵", "cactus"],
      ["🌲", "tree evergreen"],
      ["🍀", "clover luck four leaf"],
      ["🌍", "earth globe world"],
      ["🌙", "moon night"],
      ["⭐", "star"],
      ["⚡", "lightning bolt zap"],
      ["🔥", "fire hot lit"],
      ["🌈", "rainbow"],
      ["☀️", "sun sunny"],
      ["☁️", "cloud"],
      ["❄️", "snowflake cold snow"],
      ["🌊", "wave ocean water"]
    ]
  },
  {
    id: "food",
    label: "Food",
    icon: "🍕",
    emojis: [
      ["🍏", "green apple"],
      ["🍎", "apple red"],
      ["🍊", "orange tangerine"],
      ["🍋", "lemon"],
      ["🍌", "banana"],
      ["🍉", "watermelon"],
      ["🍇", "grapes"],
      ["🍓", "strawberry"],
      ["🫐", "blueberries"],
      ["🍒", "cherries"],
      ["🍑", "peach"],
      ["🍍", "pineapple"],
      ["🥑", "avocado"],
      ["🍅", "tomato"],
      ["🥕", "carrot"],
      ["🌽", "corn"],
      ["🍞", "bread"],
      ["🥐", "croissant"],
      ["🧀", "cheese"],
      ["🍗", "chicken leg meat"],
      ["🍔", "burger hamburger"],
      ["🍟", "fries"],
      ["🍕", "pizza"],
      ["🌭", "hot dog"],
      ["🌮", "taco"],
      ["🍣", "sushi"],
      ["🍜", "noodles ramen soup"],
      ["🍦", "ice cream"],
      ["🍩", "donut doughnut"],
      ["🍪", "cookie"],
      ["🎂", "birthday cake"],
      ["🍫", "chocolate"],
      ["☕", "coffee hot drink"],
      ["🍵", "tea green"],
      ["🍺", "beer"],
      ["🥤", "soda cup drink"]
    ]
  },
  {
    id: "activities",
    label: "Activities",
    icon: "⚽",
    emojis: [
      ["⚽", "soccer football"],
      ["🏀", "basketball"],
      ["🏈", "american football"],
      ["⚾", "baseball"],
      ["🎾", "tennis"],
      ["🏐", "volleyball"],
      ["🎱", "billiards pool eight ball"],
      ["🏓", "ping pong table tennis"],
      ["🏸", "badminton"],
      ["🥊", "boxing glove"],
      ["⛳", "golf flag"],
      ["🎣", "fishing"],
      ["🛹", "skateboard"],
      ["🎿", "ski"],
      ["🏆", "trophy win champion"],
      ["🥇", "gold medal first"],
      ["🥈", "silver medal second"],
      ["🥉", "bronze medal third"],
      ["🎯", "dart target bullseye"],
      ["🎮", "video game controller"],
      ["🎲", "dice game"],
      ["🎸", "guitar"],
      ["🎹", "piano keyboard"],
      ["🎤", "microphone sing karaoke"],
      ["🎧", "headphones music"],
      ["🎬", "clapper movie film"],
      ["🎨", "art palette paint"],
      ["🧩", "puzzle piece"],
      ["♟️", "chess pawn"],
      ["🚴", "cycling bike bicycle"]
    ]
  },
  {
    id: "objects",
    label: "Objects",
    icon: "💡",
    emojis: [
      ["⌚", "watch time"],
      ["📱", "phone mobile"],
      ["💻", "laptop computer"],
      ["⌨️", "keyboard"],
      ["🖥️", "desktop computer"],
      ["🖨️", "printer"],
      ["📷", "camera photo"],
      ["🎥", "video camera movie"],
      ["📞", "telephone call"],
      ["🔋", "battery"],
      ["💡", "light bulb idea"],
      ["🔦", "flashlight torch"],
      ["📚", "books"],
      ["📝", "memo note"],
      ["✏️", "pencil"],
      ["📌", "pushpin pin"],
      ["📎", "paperclip"],
      ["✂️", "scissors cut"],
      ["🔑", "key"],
      ["🔒", "lock secure"],
      ["🔨", "hammer tool"],
      ["🧲", "magnet"],
      ["💊", "pill medicine"],
      ["🧸", "teddy bear toy"],
      ["🎁", "gift present"],
      ["🎈", "balloon party"],
      ["✉️", "envelope mail email"],
      ["📦", "package box"],
      ["🛒", "shopping cart"],
      ["💰", "money bag"]
    ]
  },
  {
    id: "symbols",
    label: "Symbols",
    icon: "❤️",
    emojis: [
      ["❤️", "red heart love"],
      ["🧡", "orange heart"],
      ["💛", "yellow heart"],
      ["💚", "green heart"],
      ["💙", "blue heart"],
      ["💜", "purple heart"],
      ["🖤", "black heart"],
      ["🤍", "white heart"],
      ["💔", "broken heart"],
      ["❣️", "heart exclamation"],
      ["💕", "two hearts"],
      ["💞", "revolving hearts"],
      ["💓", "beating heart"],
      ["💗", "growing heart"],
      ["💖", "sparkling heart"],
      ["💘", "heart arrow cupid"],
      ["💝", "heart ribbon gift"],
      ["💯", "hundred 100 perfect"],
      ["💢", "anger symbol"],
      ["💥", "collision boom explosion"],
      ["💫", "dizzy star"],
      ["💦", "sweat droplets water"],
      ["💤", "zzz sleep"],
      ["✅", "check mark done yes"],
      ["❌", "cross x no wrong"],
      ["❓", "question mark"],
      ["❗", "exclamation mark"],
      ["➕", "plus add"],
      ["➖", "minus subtract"],
      ["✔️", "check tick"],
      ["🔔", "bell notification"],
      ["🎵", "music note"],
      ["🎶", "music notes"],
      ["♻️", "recycle"],
      ["🚫", "prohibited no ban"],
      ["⚠️", "warning caution"]
    ]
  }
];

function EmojiButton({ emoji, onSelect }: { emoji: string; onSelect: (emoji: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(emoji)}
      aria-label={`Insert ${emoji}`}
      className="hover:bg-muted focus-visible:ring-ring/50 flex size-8 cursor-pointer items-center justify-center rounded-md text-lg outline-none focus-visible:ring-2">
      {emoji}
    </button>
  );
}

export function EmojiPicker({
  onSelect,
  children
}: {
  onSelect: (emoji: string) => void;
  children: React.ReactNode;
}) {
  const [categoryId, setCategoryId] = useState(EMOJI_CATEGORIES[0].id);
  const [query, setQuery] = useState("");

  const category = EMOJI_CATEGORIES.find((item) => item.id === categoryId) ?? EMOJI_CATEGORIES[0];
  const normalizedQuery = query.trim().toLowerCase();
  const searchResults = normalizedQuery
    ? EMOJI_CATEGORIES.flatMap((item) =>
        item.emojis.filter(([, keywords]) => keywords.includes(normalizedQuery))
      )
    : null;

  return (
    <Popover onOpenChange={(open) => !open && setQuery("")}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-80 p-0">
        <div className="border-b p-2">
          <div className="relative">
            <Search className="text-muted-foreground absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search emojis..."
              className="h-8 ps-8 text-sm"
            />
          </div>
        </div>
        {searchResults ? (
          <div className="grid max-h-56 grid-cols-8 gap-0.5 overflow-y-auto p-2">
            {searchResults.length > 0 ? (
              searchResults.map(([emoji], index) => (
                <EmojiButton key={`${emoji}-${index}`} emoji={emoji} onSelect={onSelect} />
              ))
            ) : (
              <div className="text-muted-foreground col-span-8 py-6 text-center text-sm">
                No emoji found.
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-1 border-b p-1.5">
              {EMOJI_CATEGORIES.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title={item.label}
                  aria-label={item.label}
                  onClick={() => setCategoryId(item.id)}
                  className={cn("text-base", item.id === categoryId && "bg-muted")}>
                  {item.icon}
                </Button>
              ))}
            </div>
            <div className="text-muted-foreground px-3 pt-2 text-xs font-medium">
              {category.label}
            </div>
            <div className="grid max-h-56 grid-cols-8 gap-0.5 overflow-y-auto p-2">
              {category.emojis.map(([emoji]) => (
                <EmojiButton key={emoji} emoji={emoji} onSelect={onSelect} />
              ))}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
