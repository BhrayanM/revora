# Sales Readiness & Demo Guide

## What is Revora?
Revora (AI Growth Platform) is an all-in-one CRM and workflow automation platform designed to help agencies, B2B services, and consultants manage leads, orchestrate AI-driven communications, and streamline their sales pipelines.

## The Problem it Solves
Most small businesses struggle with tool fatigue, stringing together Zapier, HubSpot, Calendly, and OpenAI in complex ways. Revora consolidates these capabilities into a single cohesive platform with native AI workflow orchestration, reducing cost and complexity.

## Core Capabilities
- **CRM & Pipeline Management:** Track leads through customizable stages.
- **AI Automation:** Trigger intelligent workflows for lead qualification, outreach, and summarization.
- **Universal Integrations:** Seamlessly connect with GoHighLevel, HubSpot, Slack, Tally, and Google Workspace.
- **Unified Inbox:** Consolidated communication log (Email, SMS, internal notes) via unified integrations.

## Demo Mode Limitations
Currently, Revora is operating in **DEMO/LOCAL** mode (Phase 14.8 pre-production).
- **Data:** Uses local database schemas. No real personal data should be entered.
- **Automations:** Real API calls to OpenAI or HubSpot are stubbed unless explicit API keys are provided.
- **Rate Limiting:** Operates purely in-memory.
- **Email/SMS:** Mocked via the UI and standard output. No real emails or SMS are dispatched.

## First-Client Activation Checklist
When the first paying client is onboarded, the system requires transitioning to **Production Active** (Phase 14.9). This requires:
1. Activating Supabase Pro (for production database limits and PITR backups).
2. Registering real OAuth Application IDs for integrations (Google, Slack, HubSpot).
3. Activating Vercel Pro (if traffic demands it) and injecting production environment variables.
4. Setting up custom domains and DNS records (SPF, DKIM) for reliable email deliverability.
5. Provisioning Upstash Redis for distributed rate limiting.

See `docs/DEPLOYMENT_READINESS.md` for the technical deployment runbook.
