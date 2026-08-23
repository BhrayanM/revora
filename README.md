# Revora

![CI Status](https://github.com/BhrayanM/revora/actions/workflows/ci.yml/badge.svg?branch=master)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)

Multi-tenant AI revenue automation platform built with Next.js, Supabase, and secure third-party integrations.

## Overview

Revora is an enterprise-grade SaaS application designed for AI-assisted lead management, qualification, and automated CRM workflows. It combines a high-performance public landing architecture with a strictly isolated multi-tenant organization dashboard.

## Core Capabilities

- **Lead Management & Pipeline:** Automated lead ingestion, visualization, and lifecycle tracking.
- **Automation Workflows:** Webhook-based trigger systems and execution retries.
- **CRM Integrations:** Bi-directional syncing with CRM systems.
- **Calendar & Communications:** Seamless scheduling and communication.
- **Multi-tenant Architecture:** Organization and workspace scoping with strict row-level security.
- **Secure Authentication:** MFA/TOTP, Turnstile bot protection, PKCE OAuth, and authenticated legal consents.

## Product Preview

### Authentication
Secure login with robust authentication methods and Cloudflare Turnstile protection.
![Revora Login](./docs/assets/screenshots/revora-login.png)

### Integrations
Seamless multi-tenant connections to external CRMs, workflows, and automation tools.
![Revora Integrations](./docs/assets/screenshots/revora-integrations.png)

## Architecture

```mermaid
graph TD
    classDef client fill:#f9f9f9,stroke:#333,stroke-width:2px;
    classDef core fill:#e1f5fe,stroke:#0288d1,stroke-width:2px;
    classDef data fill:#e8f5e9,stroke:#388e3c,stroke-width:2px;
    classDef ext fill:#fff3e0,stroke:#f57c00,stroke-width:2px;

    User(("Users")):::client
    
    subgraph Platform ["Next.js Application"]
        UI["UI & Core Logic<br>(React 19 / Tailwind)"]:::core
        Auth["Authentication / Organizations / Workspaces"]:::core
        API["Application Services<br>(Rate Limited & HMAC Validated)"]:::core
    end
    
    subgraph Data Layer
        DB[("Supabase<br>(PostgreSQL RLS)")]:::data
    end
    
    subgraph Integrations
        CRM["HubSpot / GoHighLevel"]:::ext
        Auto["n8n / Zapier / Make"]:::ext
        Comms["Slack / Twilio / Gmail"]:::ext
        Cal["Google Calendar / Tally"]:::ext
    end

    User --> UI
    UI --> Auth
    Auth --> API
    API <--> DB
    
    API -.-> CRM
    API -.-> Auto
    API -.-> Comms
    API -.-> Cal
```

## Security

- **Role-Based Access Control (RBAC):** Owner, Admin, Member constraints.
- **Row-Level Security (RLS):** Database isolation at the tenant level via Supabase.
- **Secrets Management:** Secure secret handling and strict separation of server/client keys.
- **OAuth & Tokens:** PKCE authentication and replay protection.
- **API Protection:** HMAC webhook verification and distributed rate limiting.
- **MFA:** Enforced TOTP multi-factor authentication and Cloudflare Turnstile integration.

## Quality

- 100% strict TypeScript.
- ESLint for static analysis.
- Integration contract tests validation.
- Automated UX validation.
- Production build validation.
- CI/CD quality gates via GitHub Actions.

## Tech Stack

- **Framework:** Next.js App Router (React 19)
- **Database:** Supabase PostgreSQL
- **Styling:** Tailwind CSS v4, Radix Primitives
- **Infrastructure:** Vercel, Supabase, Upstash Redis

## Local Development

1. Clone the repository
2. Run `npm install`
3. Copy `.env.example` to `.env` and fill the placeholder values
4. Run `npm run dev` to start the Next.js server on `localhost:3000`

## Technical Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [Provisioning Guide](./docs/PROVISIONING.md)
- [Observability](./docs/OBSERVABILITY.md)
- [Secrets Architecture](./docs/SECRETS_ARCHITECTURE.md)
- [Deployment Readiness](./docs/DEPLOYMENT_READINESS.md)
- [Backup and Recovery](./docs/BACKUP_RECOVERY.md)

## Contact / License

Private - All rights reserved.
