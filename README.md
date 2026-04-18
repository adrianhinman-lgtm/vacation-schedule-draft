# Vacation Schedule Draft 🏝

A beautiful, mobile-first PWA for running fair snake-order vacation scheduling drafts.

## Tech Stack
- **Frontend**: Vanilla JS PWA (no build tools needed)
- **Database**: Supabase (Postgres)
- **Email**: Resend
- **Hosting**: Vercel
- **Domain**: vacationscheduledraft.com

## Setup Instructions

### 1. Supabase Database
1. Go to your Supabase project → SQL Editor
2. Copy and paste the contents of `supabase-schema.sql`
3. Click **Run** — this creates all tables and security policies

### 2. Resend Domain Verification
1. Go to resend.com → Domains → Add Domain
2. Enter `vacationscheduledraft.com`
3. Add the DNS records Resend provides to your Namecheap domain
4. Wait for verification (usually 5-30 minutes)

### 3. Deploy to Vercel
1. Go to vercel.com → Sign up with GitHub
2. Push this folder to a GitHub repo
3. Import the repo in Vercel
4. Deploy — Vercel auto-detects the config

### 4. Connect Your Domain
1. In Vercel → Project Settings → Domains
2. Add `vacationscheduledraft.com`
3. Add the Vercel DNS records to Namecheap
4. Wait for propagation (~10 minutes)

## How It Works

1. **Admin creates a draft** — enters date periods, participants, and their email
2. **Draft launches** — first person gets a magic link email
3. **Snake order** — picks go 1→N, then N→1, alternating each round
4. **Real-time** — the board polls every 4 seconds, picks appear instantly
5. **Completion** — everyone gets a final schedule summary by email

## PWA Installation
- **iPhone**: Open in Safari → Share → Add to Home Screen
- **Android**: Open in Chrome → Menu → Add to Home Screen
- **Desktop**: Click the install icon in the address bar

## Files
- `index.html` — the entire app
- `manifest.json` — PWA configuration  
- `sw.js` — service worker for offline support
- `vercel.json` — hosting configuration
- `supabase-schema.sql` — database tables
