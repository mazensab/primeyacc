"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { LayoutGridIcon, LogOutIcon, MoonIcon, UserRoundIcon } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useAuthContext } from "@/components/providers/AuthProvider";

const KEY = "Mhamcloud-locale";
function apiUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") || process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "";
  return base ? `${base}${path}` : path;
}
function cookie(name: string) {
  const prefix = `${encodeURIComponent(name)}=`;
  const value = document.cookie.split(";").map(v => v.trim()).find(v => v.startsWith(prefix));
  return value ? decodeURIComponent(value.slice(prefix.length)) : "";
}
function initials(name: string) {
  return (name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(v => v[0]).join("") || "U").toUpperCase();
}
export default function UserMenu() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { session, logoutLocal } = useAuthContext();
  const [mounted, setMounted] = React.useState(false);
  const [ar, setAr] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    const sync = () => setAr(window.localStorage.getItem(KEY) !== "en");
    sync(); setMounted(true);
    window.addEventListener("Mhamcloud-locale-changed", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("Mhamcloud-locale-changed", sync); window.removeEventListener("storage", sync); };
  }, []);
  const u = session.user;
  const name = String(session.profile?.display_name || "").trim() || [u?.first_name, u?.last_name].filter(Boolean).join(" ").trim() || String(u?.username || (ar ? "مستخدم النظام" : "System user"));
  const email = String(u?.email || u?.username || "");
  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch(apiUrl("/api/auth/csrf/"), { credentials: "include", cache: "no-store" });
      const response = await fetch(apiUrl("/api/auth/logout/"), {
        method: "POST", credentials: "include",
        headers: { Accept: "application/json", ...(cookie("csrftoken") ? { "X-CSRFToken": cookie("csrftoken") } : {}) },
      });
      if (!response.ok) throw new Error(ar ? "تعذر تسجيل الخروج." : "Could not log out.");
      logoutLocal(); router.replace("/login"); router.refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : (ar ? "تعذر تسجيل الخروج." : "Could not log out.")); }
    finally { setBusy(false); }
  }
  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Avatar className="cursor-pointer border"><AvatarFallback className="bg-foreground text-xs font-semibold text-background">{initials(name)}</AvatarFallback></Avatar>
    </DropdownMenuTrigger>
    <DropdownMenuContent className="w-72" align={ar ? "start" : "end"} sideOffset={8}>
      <DropdownMenuLabel><div className="flex items-center gap-3 py-1">
        <Avatar className="size-10 border"><AvatarFallback className="bg-foreground text-xs font-semibold text-background">{initials(name)}</AvatarFallback></Avatar>
        <div className="min-w-0 flex-1"><div className="truncate font-semibold">{name}</div><div dir="ltr" className="truncate text-xs text-muted-foreground">{email}</div></div>
      </div></DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem asChild><Link href="/system/profile"><UserRoundIcon className="text-[#a57b3d]" />{ar ? "الملف التعريفي" : "Profile"}</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link href="/system"><LayoutGridIcon className="text-muted-foreground" />{ar ? "لوحة النظام" : "Dashboard"}</Link></DropdownMenuItem>
        {mounted ? <DropdownMenuItem onSelect={e => { e.preventDefault(); setTheme(theme === "dark" ? "light" : "dark"); }}><MoonIcon className="text-muted-foreground" />{ar ? "الوضع الداكن" : "Dark mode"}<Switch checked={theme === "dark"} className="ms-auto" /></DropdownMenuItem> : null}
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem disabled={busy} onSelect={e => { e.preventDefault(); void logout(); }}><LogOutIcon className="text-muted-foreground" />{busy ? (ar ? "جارٍ تسجيل الخروج..." : "Logging out...") : (ar ? "تسجيل الخروج" : "Log out")}</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}
