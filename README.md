# Mihra Mist ERP 2.0

ERP 2.0 application foundation and native reservation-calendar integration.

## Project status

This repository is the new ERP 2.0 source repository. The existing live ERP and its Supabase project remain separate and are not modified by this foundation.

## Application

- React + TypeScript + Vite
- Supabase-backed authentication and data access
- Native reservation calendar: dates by row and physical rooms by column
- Reservation and maintenance-block workflows call database RPCs

## Setup

1. Copy `.env.example` to `.env`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the ERP 2.0 Supabase project.
3. Run `npm install`.
4. Run `npm run dev` for local development.
5. Run `npm run build` to create the production bundle in `dist/`.

See `ERP2_NEXT_STEPS.md` for deployment and owner-profile bootstrap notes.

## Important

This is an integration foundation, not a claim that every ERP module or end-to-end operational workflow is finished. Test all workflows before production use.
