# ERP 2.0 — Next steps and deployment gates

## New backend

- Supabase project ref: `hsmszkqdiojpwfvcyjmy`
- Region: `ap-south-1` (Mumbai)
- Project URL: `https://hsmszkqdiojpwfvcyjmy.supabase.co`
- This backend is separate from the legacy production ERP backend.

## Netlify environment

Set these variables on the ERP 2.0 Netlify site:

- `VITE_SUPABASE_URL=https://hsmszkqdiojpwfvcyjmy.supabase.co`
- `VITE_SUPABASE_ANON_KEY=<new project's publishable key>`

Never place a Supabase service-role key in frontend environment variables.

Build command: `npm run build`
Publish directory: `dist`

## Owner access bootstrap

The staff RLS policies require an active row in `public.employee_profiles` linked to an Auth user.

1. In Supabase Dashboard → Authentication → Users, create the owner login.
2. Copy the Auth user's UUID.
3. Run this SQL in the NEW ERP 2.0 project, replacing the placeholders:

```sql
insert into public.employee_profiles (id, employee_code, full_name, role, active)
values ('<AUTH_USER_UUID>'::uuid, 'OWNER-001', '<OWNER_NAME>', 'owner', true);
```

4. Sign in to the ERP app using that user.

## Release checklist

- [ ] Confirm the repository branch contains the complete app source.
- [ ] Install dependencies and pass `npm run build`.
- [ ] Verify database RPC argument names and execute reservation/maintenance tests.
- [ ] Verify owner and staff RLS behavior.
- [ ] Set Netlify environment variables for the NEW Supabase project.
- [ ] Deploy a preview and test before making it the production deploy.

The calendar is a first-pass integration. CRM-to-reservation automatic conversion, editing/rescheduling, and the other ERP modules are not complete. Do not use this build for live resort operations until end-to-end tests pass.
