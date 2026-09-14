"use client";
import { useAuth } from "@/components/providers/AuthProvider";
import SystemUserDetailPage from "@/app/system/users/[id]/page";
export default function SystemCurrentUserProfile(){const s=useAuth();const id=s.user?.id?String(s.user.id):"";return id?<SystemUserDetailPage userId={id} profileMode />:<div className="min-h-72 animate-pulse rounded-xl border bg-muted/20" />;}
