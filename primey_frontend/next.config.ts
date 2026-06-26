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
        // CURRENT WHATSAPP APIs - EXPLICIT DEV PROXY
        // ------------------------------------------------------
        // PrimeyAcc current routes:
        // - /api/system/whatsapp/
        // - /api/company/whatsapp/
        // Keeps trailing slash alignment with Django.
        // ======================================================
        {
          source: "/api/system/whatsapp",
          destination: `${djangoBaseUrl}/api/system/whatsapp/`,
        },
        {
          source: "/api/system/whatsapp/:path*",
          destination: `${djangoBaseUrl}/api/system/whatsapp/:path*/`,
        },
        {
          source: "/api/company/whatsapp",
          destination: `${djangoBaseUrl}/api/company/whatsapp/`,
        },
        {
          source: "/api/company/whatsapp/:path*",
          destination: `${djangoBaseUrl}/api/company/whatsapp/:path*/`,
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