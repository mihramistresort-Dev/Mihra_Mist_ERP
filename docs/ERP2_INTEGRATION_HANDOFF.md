# Mihra Mist ERP 2.0 — Integration handoff

The native reservation calendar integration is maintained in this branch. It presents dates as rows and physical rooms as columns, with reservation and maintenance workflows calling the new Supabase RPC functions.

## Current limitations

- This is a first-pass calendar integration, not a complete operational ERP.
- CRM-to-reservation automatic allocation, editing/rescheduling, and wider ERP modules remain future work.
- Build and deployment are not yet verified in this environment.
- Do not use for live resort operations until authentication, RLS, RPC permissions, and end-to-end tests have passed.

## Deployment settings

Netlify build command: `npm run build`
Publish directory: `dist`

Required build variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Use only the new ERP 2.0 Supabase project. Never use the old production ERP's Supabase project or any service-role key in the browser.
