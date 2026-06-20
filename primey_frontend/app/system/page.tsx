export default function SystemPage() {
  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">PrimeyAcc</p>
          <h1 className="text-3xl font-bold">System Workspace</h1>
          <p className="max-w-3xl text-muted-foreground">
            Clean system workspace foundation. Platform, company, customer, and agent modules will be rebuilt from this clean route structure based on the approved PrimeyAcc backend contracts.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <a
            href="/system"
            className="rounded-2xl border bg-card p-5 text-card-foreground shadow-sm transition hover:bg-accent"
          >
            <p className="text-sm text-muted-foreground">System</p>
            <h2 className="mt-2 text-xl font-semibold">Platform Control</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              System administration and platform-level foundation.
            </p>
          </a>

          <a
            href="/company"
            className="rounded-2xl border bg-card p-5 text-card-foreground shadow-sm transition hover:bg-accent"
          >
            <p className="text-sm text-muted-foreground">Company</p>
            <h2 className="mt-2 text-xl font-semibold">Company Workspace</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Company operations will be rebuilt cleanly here.
            </p>
          </a>

          <a
            href="/agent"
            className="rounded-2xl border bg-card p-5 text-card-foreground shadow-sm transition hover:bg-accent"
          >
            <p className="text-sm text-muted-foreground">Agent</p>
            <h2 className="mt-2 text-xl font-semibold">Agent Workspace</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Agent flows will be rebuilt cleanly here.
            </p>
          </a>
        </div>
      </section>
    </main>
  );
}
