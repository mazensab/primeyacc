import type { NextConfig } from "next"

const isDevelopment = process.env.NODE_ENV === "development"
const djangoBaseUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || "http://127.0.0.1:8000"

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "drive.google.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },

  async rewrites() {
    if (!isDevelopment) {
      return []
    }

    return {
      beforeFiles: [
        // ======================================================
        // 🟣 WHATSAPP CENTER - EXPLICIT DEV PROXY
        // ------------------------------------------------------
        // يمنع 301 بسبب trailing slash في Django
        // ======================================================
        {
          source: "/api/whatsapp/settings",
          destination: `${djangoBaseUrl}/api/whatsapp/settings/`,
        },
        {
          source: "/api/whatsapp/settings/",
          destination: `${djangoBaseUrl}/api/whatsapp/settings/`,
        },
        {
          source: "/api/whatsapp/status",
          destination: `${djangoBaseUrl}/api/whatsapp/status/`,
        },
        {
          source: "/api/whatsapp/status/",
          destination: `${djangoBaseUrl}/api/whatsapp/status/`,
        },
        {
          source: "/api/whatsapp/session/create-qr",
          destination: `${djangoBaseUrl}/api/whatsapp/session/create-qr/`,
        },
        {
          source: "/api/whatsapp/session/create-qr/",
          destination: `${djangoBaseUrl}/api/whatsapp/session/create-qr/`,
        },
        {
          source: "/api/whatsapp/session/create-pairing-code",
          destination: `${djangoBaseUrl}/api/whatsapp/session/create-pairing-code/`,
        },
        {
          source: "/api/whatsapp/session/create-pairing-code/",
          destination: `${djangoBaseUrl}/api/whatsapp/session/create-pairing-code/`,
        },
        {
          source: "/api/whatsapp/session/disconnect",
          destination: `${djangoBaseUrl}/api/whatsapp/session/disconnect/`,
        },
        {
          source: "/api/whatsapp/session/disconnect/",
          destination: `${djangoBaseUrl}/api/whatsapp/session/disconnect/`,
        },
        {
          source: "/api/whatsapp/logs",
          destination: `${djangoBaseUrl}/api/whatsapp/logs/`,
        },
        {
          source: "/api/whatsapp/logs/",
          destination: `${djangoBaseUrl}/api/whatsapp/logs/`,
        },
        {
          source: "/api/whatsapp/templates",
          destination: `${djangoBaseUrl}/api/whatsapp/templates/`,
        },
        {
          source: "/api/whatsapp/templates/",
          destination: `${djangoBaseUrl}/api/whatsapp/templates/`,
        },
        {
          source: "/api/whatsapp/broadcasts",
          destination: `${djangoBaseUrl}/api/whatsapp/broadcasts/`,
        },
        {
          source: "/api/whatsapp/broadcasts/",
          destination: `${djangoBaseUrl}/api/whatsapp/broadcasts/`,
        },
        {
          source: "/api/whatsapp/inbox/summary",
          destination: `${djangoBaseUrl}/api/whatsapp/inbox/summary/`,
        },
        {
          source: "/api/whatsapp/inbox/summary/",
          destination: `${djangoBaseUrl}/api/whatsapp/inbox/summary/`,
        },
        {
          source: "/api/whatsapp/inbox/conversations",
          destination: `${djangoBaseUrl}/api/whatsapp/inbox/conversations/`,
        },
        {
          source: "/api/whatsapp/inbox/conversations/",
          destination: `${djangoBaseUrl}/api/whatsapp/inbox/conversations/`,
        },

        // ======================================================
        // 🏥 PRIMEY CARE PROVIDERS / CENTERS
        // ======================================================
        {
          source: "/api/providers",
          destination: `${djangoBaseUrl}/api/providers/`,
        },
        {
          source: "/api/providers/",
          destination: `${djangoBaseUrl}/api/providers/`,
        },
        {
          source: "/api/providers/active",
          destination: `${djangoBaseUrl}/api/providers/active/`,
        },
        {
          source: "/api/providers/active/",
          destination: `${djangoBaseUrl}/api/providers/active/`,
        },
        {
          source: "/api/providers/:provider_id",
          destination: `${djangoBaseUrl}/api/providers/:provider_id/`,
        },
        {
          source: "/api/providers/:provider_id/",
          destination: `${djangoBaseUrl}/api/providers/:provider_id/`,
        },

        // ======================================================
        // 📦 SYSTEM PLANS
        // ======================================================
        {
          source: "/api/system/plans/admin",
          destination: `${djangoBaseUrl}/api/system/plans/admin/`,
        },
        {
          source: "/api/system/plans/admin/",
          destination: `${djangoBaseUrl}/api/system/plans/admin/`,
        },
        {
          source: "/api/system/plans/create",
          destination: `${djangoBaseUrl}/api/system/plans/create/`,
        },
        {
          source: "/api/system/plans/create/",
          destination: `${djangoBaseUrl}/api/system/plans/create/`,
        },
        {
          source: "/api/system/plans/:plan_id/update",
          destination: `${djangoBaseUrl}/api/system/plans/:plan_id/update/`,
        },
        {
          source: "/api/system/plans/:plan_id/update/",
          destination: `${djangoBaseUrl}/api/system/plans/:plan_id/update/`,
        },

        // ======================================================
        // 🔔 SYSTEM NOTIFICATIONS WS
        // ======================================================
        {
          source: "/ws/system/notifications",
          destination: `${djangoBaseUrl}/ws/system/notifications/`,
        },
        {
          source: "/ws/system/notifications/",
          destination: `${djangoBaseUrl}/ws/system/notifications/`,
        },

        // ======================================================
        // 🌐 GENERIC DEV PROXY
        // ------------------------------------------------------
        // يبقى آخر شيء
        // ======================================================
        {
          source: "/api/:path*",
          destination: `${djangoBaseUrl}/api/:path*`,
        },
        {
          source: "/ws/:path*",
          destination: `${djangoBaseUrl}/ws/:path*`,
        },
      ],
    }
  },
}

export default nextConfig