import type { Task, TaskUser } from "./store";

/* -------------------------------------------------------------------------- */
/*                                    Team                                    */
/* -------------------------------------------------------------------------- */

function member(name: string, img: number): TaskUser {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("");

  return {
    name,
    src: `https://i.pravatar.cc/150?img=${img}`,
    alt: `${name} avatar`,
    fallback: initials,
    email: `${name.toLowerCase().replace(" ", ".")}@acme.com`
  };
}

export const team = {
  emma: member("Emma Johnson", 1),
  daniel: member("Daniel Smith", 2),
  lucas: member("Lucas Brown", 3),
  sophia: member("Sophia Reyes", 4),
  mia: member("Mia Williams", 5),
  jack: member("Jack Lewis", 6),
  olivia: member("Olivia Davis", 7),
  henry: member("Henry Turner", 8),
  charlie: member("Charlie Wilson", 9),
  ava: member("Ava Robertson", 10),
  liam: member("Liam Martinez", 11),
  isabella: member("Isabella Nguyen", 12),
  noah: member("Noah Taylor", 13),
  ella: member("Ella Moore", 14),
  ethan: member("Ethan Clark", 15),
  grace: member("Grace Reed", 16)
} satisfies Record<string, TaskUser>;

export const boardUsers: TaskUser[] = Object.values(team);

/* -------------------------------------------------------------------------- */
/*                                   Tasks                                    */
/* -------------------------------------------------------------------------- */

export const initialColumnTitles: Record<string, string> = {
  backlog: "Backlog",
  inProgress: "In Progress",
  done: "Done"
};

export const initialColumns: Record<string, Task[]> = {
  backlog: [
    {
      id: "1",
      title: "Integrate Stripe payment gateway",
      description: "Set up and configure Stripe API for handling credit card transactions.",
      priority: "high",
      dueDate: "2026-09-20",
      users: [team.emma, team.daniel],
      subtasks: [
        { id: "st-1", title: "Create Stripe account and API keys", done: true },
        { id: "st-2", title: "Implement checkout session endpoint", done: false },
        { id: "st-3", title: "Handle webhook events", done: false }
      ],
      commentsList: [
        {
          id: "c-1",
          author: team.daniel.name,
          avatar: team.daniel.src,
          date: "Aug 19, 2026 at 4:02 PM",
          text: "Test keys are in the shared vault. Webhook signing secret rotates weekly."
        },
        {
          id: "c-2",
          author: team.emma.name,
          avatar: team.emma.src,
          date: "Aug 20, 2026 at 10:12 AM",
          text: "Thanks! Starting with the checkout session endpoint today."
        }
      ],
      files: [
        { id: "f-1", name: "payment-flow-diagram.png", size: "840 KB" },
        { id: "f-2", name: "stripe-integration-notes.pdf", size: "1.1 MB" }
      ]
    },
    {
      id: "2",
      title: "Redesign marketing homepage",
      description: "Update the homepage with the new brand colors, typography, and hero section.",
      priority: "medium",
      dueDate: "2026-09-25",
      users: [team.lucas, team.sophia],
      subtasks: [
        { id: "st-4", title: "Collect brand assets from design", done: false },
        { id: "st-5", title: "Rebuild hero section", done: false }
      ],
      commentsList: [
        {
          id: "c-3",
          author: team.sophia.name,
          avatar: team.sophia.src,
          date: "Aug 18, 2026 at 3:30 PM",
          text: "Figma file with the new palette is ready for review."
        }
      ],
      files: [{ id: "f-3", name: "homepage-wireframes.fig", size: "3.2 MB" }]
    },
    {
      id: "3",
      title: "Set up automated backups",
      description: "Implement daily database backups with secure cloud storage.",
      priority: "low",
      dueDate: "2026-09-28",
      users: [team.mia, team.jack],
      subtasks: [
        { id: "st-6", title: "Pick a storage bucket and region", done: true },
        { id: "st-7", title: "Schedule nightly cron job", done: false },
        { id: "st-8", title: "Verify restore procedure", done: false }
      ],
      commentsList: [
        {
          id: "c-4",
          author: team.jack.name,
          avatar: team.jack.src,
          date: "Aug 17, 2026 at 9:05 AM",
          text: "Retention policy: 30 daily snapshots, then weekly for a year."
        },
        {
          id: "c-5",
          author: team.mia.name,
          avatar: team.mia.src,
          date: "Aug 18, 2026 at 11:40 AM",
          text: "Bucket created. Testing the restore flow on staging first."
        },
        {
          id: "c-6",
          author: team.jack.name,
          avatar: team.jack.src,
          date: "Aug 19, 2026 at 2:22 PM",
          text: "Remember to encrypt snapshots at rest."
        }
      ],
      files: []
    },
    {
      id: "4",
      title: "Implement blog search functionality",
      description: "Add a search bar to filter blog posts by title and tags.",
      priority: "medium",
      dueDate: "2026-09-29",
      users: [team.olivia, team.henry],
      subtasks: [{ id: "st-9", title: "Index posts for full text search", done: false }],
      commentsList: [],
      files: [{ id: "f-4", name: "search-api-draft.md", size: "12 KB" }]
    }
  ],
  inProgress: [
    {
      id: "5",
      title: "Dark mode toggle implementation",
      description: "Allow users to switch between light and dark themes in settings.",
      priority: "high",
      dueDate: "2026-09-18",
      users: [team.charlie, team.ava],
      subtasks: [
        { id: "st-10", title: "Add theme context and provider", done: true },
        { id: "st-11", title: "Persist preference to local storage", done: false },
        { id: "st-12", title: "Audit components for hardcoded colors", done: false }
      ],
      commentsList: [
        {
          id: "c-7",
          author: team.ava.name,
          avatar: team.ava.src,
          date: "Aug 20, 2026 at 2:15 PM",
          text: "System preference detection works, but the toggle flashes light mode on reload. Looking into it."
        },
        {
          id: "c-8",
          author: team.charlie.name,
          avatar: team.charlie.src,
          date: "Aug 21, 2026 at 9:40 AM",
          text: "Nice catch. Let's read the stored theme in a blocking script before hydration."
        }
      ],
      files: [{ id: "f-5", name: "dark-mode-specs.fig", size: "2.4 MB" }]
    },
    {
      id: "6",
      title: "Database schema refactoring",
      description: "Normalize tables and improve query performance for large datasets.",
      priority: "medium",
      dueDate: "2026-09-19",
      users: [team.liam, team.isabella],
      subtasks: [
        { id: "st-13", title: "Split orders table into orders and line items", done: true },
        { id: "st-14", title: "Add covering indexes for report queries", done: true },
        { id: "st-15", title: "Write migration and rollback scripts", done: false }
      ],
      commentsList: [
        {
          id: "c-9",
          author: team.isabella.name,
          avatar: team.isabella.src,
          date: "Aug 20, 2026 at 5:55 PM",
          text: "Report queries dropped from 2.3s to 180ms with the new indexes."
        }
      ],
      files: [
        { id: "f-6", name: "schema-v2.sql", size: "45 KB" },
        { id: "f-7", name: "query-benchmarks.xlsx", size: "220 KB" }
      ]
    },
    {
      id: "7",
      title: "Accessibility improvements",
      description: "Ensure the platform meets WCAG 2.1 AA accessibility standards.",
      priority: "low",
      dueDate: "2026-09-22",
      users: [team.noah, team.ella],
      subtasks: [
        { id: "st-16", title: "Fix color contrast issues", done: true },
        { id: "st-17", title: "Add skip navigation links", done: false }
      ],
      commentsList: [
        {
          id: "c-10",
          author: team.ella.name,
          avatar: team.ella.src,
          date: "Aug 19, 2026 at 1:10 PM",
          text: "Screen reader pass on the checkout flow is done, notes attached."
        }
      ],
      files: [{ id: "f-8", name: "a11y-audit-report.pdf", size: "680 KB" }]
    }
  ],
  done: [
    {
      id: "8",
      title: "Set up CI/CD pipeline",
      description: "Automate deployment process using GitHub Actions and Vercel.",
      priority: "high",
      dueDate: "2026-09-12",
      users: [team.ethan, team.grace],
      subtasks: [
        { id: "st-18", title: "Configure GitHub Actions workflow", done: true },
        { id: "st-19", title: "Add preview deployments for PRs", done: true }
      ],
      commentsList: [
        {
          id: "c-11",
          author: team.grace.name,
          avatar: team.grace.src,
          date: "Aug 12, 2026 at 4:45 PM",
          text: "Preview URLs now post automatically on every pull request."
        },
        {
          id: "c-12",
          author: team.ethan.name,
          avatar: team.ethan.src,
          date: "Aug 12, 2026 at 6:02 PM",
          text: "Shipping it. Average deploy time is under 3 minutes."
        }
      ],
      files: [{ id: "f-9", name: "pipeline-config.yml", size: "6 KB" }]
    },
    {
      id: "9",
      title: "Initial project setup",
      description: "Create project structure, install dependencies, and configure ESLint/Prettier.",
      priority: "medium",
      dueDate: "2026-09-10",
      users: [team.henry, team.daniel],
      subtasks: [
        { id: "st-20", title: "Bootstrap Next.js app", done: true },
        { id: "st-21", title: "Set up linting and formatting", done: true }
      ],
      commentsList: [
        {
          id: "c-13",
          author: team.daniel.name,
          avatar: team.daniel.src,
          date: "Aug 10, 2026 at 11:25 AM",
          text: "Repo is ready. Conventions are documented in the README."
        }
      ],
      files: []
    }
  ]
};
