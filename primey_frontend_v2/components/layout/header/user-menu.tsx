"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  BookOpenIcon,
  CircleHelpIcon,
  LayoutGridIcon,
  LogOutIcon,
  MoonIcon,
  PlusIcon,
  UserRoundIcon
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/use-mobile";

type MenuLocale = "ar" | "en";
const LOCALE_KEY = "Mhamcloud-locale";
const LOCALE_EVENT = "Mhamcloud-locale-changed";

const accounts = [
  {
    id: "personal",
    name: "Toby Belhome",
    handle: "@tobybelhome",
    avatar: "https://i.pravatar.cc/150?img=1",
    fallback: "TB"
  },
  {
    id: "studio",
    name: "Acme Studio",
    handle: "@acmestudio",
    avatar: "https://i.pravatar.cc/150?img=12",
    fallback: "AS"
  }
];

function readLocale(): MenuLocale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem(LOCALE_KEY) === "en" ? "en" : "ar";
}

export default function UserMenu() {
  const isMobile = useIsMobile();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [locale, setLocale] = React.useState<MenuLocale>("ar");
  const [activeAccountId, setActiveAccountId] = React.useState(accounts[0].id);

  React.useEffect(() => {
    const sync = () => setLocale(readLocale());
    sync();
    setMounted(true);
    window.addEventListener(LOCALE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(LOCALE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const isArabic = locale === "ar";
  const activeAccount = accounts.find((account) => account.id === activeAccountId) ?? accounts[0];

  const accountItems = (
    <>
      {accounts.map((account) => (
        <DropdownMenuItem key={account.id} onClick={() => setActiveAccountId(account.id)}>
          <Avatar className="size-7">
            <AvatarImage src={account.avatar} alt={account.name} />
            <AvatarFallback className="text-[10px]">{account.fallback}</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 leading-tight">
            <span className="truncate font-medium">{account.name}</span>
            <span className="text-muted-foreground truncate text-xs">{account.handle}</span>
          </div>
          <span className={cn(
            "flex size-4.5 shrink-0 items-center justify-center rounded-full border",
            account.id === activeAccountId ? "bg-primary border-primary text-primary-foreground" : "border-border"
          )}>
            {account.id === activeAccountId && (
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--primary-foreground)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="size-3" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            )}
          </span>
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator />
      <DropdownMenuItem>
        <span className="border-border flex size-7 shrink-0 items-center justify-center rounded-full border border-dashed">
          <PlusIcon className="size-4" />
        </span>
        {isArabic ? "إضافة حساب" : "Add account"}
      </DropdownMenuItem>
    </>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="cursor-pointer">
          <AvatarImage src={activeAccount.avatar} alt={activeAccount.name} />
          <AvatarFallback className="rounded-lg">{activeAccount.fallback}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-64"
        align={isArabic ? "start" : "end"}
        sideOffset={8}>
        <DropdownMenuLabel className="p-0">
          <div className={cn("flex items-center gap-3 px-1.5 py-2 text-sm", isArabic ? "text-right" : "text-left")}>
            <Avatar className="size-9">
              <AvatarImage src={activeAccount.avatar} alt={activeAccount.name} />
              <AvatarFallback className="rounded-lg">{activeAccount.fallback}</AvatarFallback>
            </Avatar>
            <div className={cn("grid flex-1 text-sm leading-tight", isArabic ? "text-right" : "text-left")}>
              <span className="truncate font-semibold">{activeAccount.name}</span>
              <span className="text-muted-foreground truncate text-xs">{activeAccount.handle}</span>
            </div>
            <Badge>Pro</Badge>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {isMobile ? (
            <>
              <DropdownMenuLabel className="text-muted-foreground flex items-center gap-2 text-xs">
                <UserRoundIcon className="size-4" />
                {isArabic ? "الحساب" : "Account"}
              </DropdownMenuLabel>
              {accountItems}
              <DropdownMenuSeparator />
            </>
          ) : (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <UserRoundIcon className="text-muted-foreground" />
                {isArabic ? "الحساب" : "Account"}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-60">{accountItems}</DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          <DropdownMenuItem asChild>
            <Link href="/system">
              <LayoutGridIcon className="text-muted-foreground" />
              {isArabic ? "لوحة النظام" : "Dashboard"}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <CircleHelpIcon className="text-muted-foreground" />
            {isArabic ? "مركز المساعدة" : "Help center"}
          </DropdownMenuItem>
          <DropdownMenuItem>
            <BookOpenIcon className="text-muted-foreground" />
            {isArabic ? "الأدلة" : "Guides"}
          </DropdownMenuItem>
          {mounted && (
            <DropdownMenuItem onSelect={(event) => {
              event.preventDefault();
              setTheme(theme === "dark" ? "light" : "dark");
            }}>
              <MoonIcon className="text-muted-foreground" />
              {isArabic ? "الوضع الداكن" : "Dark mode"}
              <Switch checked={theme === "dark"} className="ms-auto" />
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <LogOutIcon className="text-muted-foreground" />
          {isArabic ? "تسجيل الخروج" : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
