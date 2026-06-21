/**
 * PrimeyAcc Frontend
 * File: app/system/page.tsx
 * Route: /system
 * Page: System Dashboard
 *
 * Purpose:
 * Header-only placeholder page.
 * This file is intentionally kept minimal so the page can be rebuilt
 * step-by-step without carrying previous UI mistakes forward.
 */

export default function SystemRoutePlaceholderPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-950">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">PrimeyAcc System Page</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">System Dashboard</h1>
        <p className="mt-3 text-sm text-slate-500">/system</p>
      </section>
    </main>
  );
}
