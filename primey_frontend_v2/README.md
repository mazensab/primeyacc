# Shadcn UI Kit Dashboards

A large collection of admin dashboard layouts, website templates, UI components, and ready-to-use blocks built with **Next.js**, **React 19**, and **shadcn/ui**. Fully responsive, mobile-first, and dark-mode ready. Save time and deliver projects faster.

![Shadcn UI Kit Dashboard](https://shadcnuikit.com/images/seo.jpg)

## About

Shadcn UI Kit Dashboard is a comprehensive UI kit that ships with dozens of pre-built pages, apps, and widget blocks so you can move straight to building product instead of boilerplate. It is built on top of the **Next.js App Router**, styled with **Tailwind CSS v4** and **shadcn/ui** (New York style), and written entirely in **TypeScript**. Every dashboard, app, and page is optimized for mobile with container-query-based responsive cards, horizontally scrollable tables, and touch-friendly interactions.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 + React 19 |
| Styling | Tailwind CSS v4, shadcn/ui (New York) |
| Language | TypeScript |
| Icons | Lucide React, Remix Icon |
| Charts | Recharts 3 |
| Tables | TanStack Table 9 |
| Forms | React Hook Form + Zod 4 |
| State | Zustand |
| Animations | Motion, tw-animate-css |
| Rich Text | Tiptap 3 |
| Flow Diagrams | React Flow (@xyflow/react) |
| Drag & Drop | dnd-kit |
| Carousel | Swiper |
| Notifications | Sonner |
| Theme | next-themes (dark mode) |

## Pages & Features

**Dashboards**
- Default, eCommerce, CRM, Finance, Crypto, Sales, Website Analytics, Payment, Hospital Management, Hotel, HR, Real Estate, Logistics, Project Management, Workflow Automation, Academy

**Apps**
- AI Chat (v1 & v2), AI Image Generator, Calendar, Chat, Mail, Notes, Kanban, Tasks, Todo List, File Manager, Courses, POS System, Social Media, API Keys, Text to Speech

**Pages**
- Profile & User Profile, Settings (Account, Appearance, Billing, Display, Notifications), Products (list, detail, create), Orders, Users, Pricing (column, single, table), Notifications, Onboarding Flow, Empty States

**Auth**
- Login (v1 & v2), Register (v1 & v2), Forgot Password

**Error Pages**
- 403, 404, 500

**Widgets**
- Analytics, eCommerce, Fitness

## Requirements

- Node.js v22 or higher
- pnpm (recommended; the project pins `pnpm` via the `packageManager` field)

## Installation

**1. Clone the repository:**

```sh
git clone https://github.com/bundui/shadcn-ui-kit-dashboard.git
cd shadcn-ui-kit-dashboard
```

**2. Install dependencies:**

```sh
pnpm install
# or
npm install
# or
yarn install
```

pnpm is recommended since the repository ships a `pnpm-lock.yaml` for reproducible installs. If npm reports peer dependency errors, add the `--legacy-peer-deps` flag:

```sh
npm install --legacy-peer-deps
```

**3. Start the development server:**

```sh
pnpm dev
# or
npm run dev
# or
yarn dev
```

**4. Open [http://localhost:3000](http://localhost:3000) in your browser.**

To start customizing, explore the files inside the `app/` and `components/` directories.

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start the development server |
| `pnpm build` | Create a production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Run ESLint (flat config) |

## Deployment

The project deploys to Vercel out of the box. The included `pnpm-workspace.yaml` and the `packageManager` field in `package.json` keep local and CI builds on the same pnpm setup. Optionally set `ENABLE_EXPERIMENTAL_COREPACK=1` in your Vercel project to use the exact pinned pnpm version.
