# Attendance Pro Enterprise v2

A production-oriented Next.js + Supabase attendance management starter for Vercel.

## Enterprise features
- Public employee ID/mobile suggestions after two characters, with live camera capture for check-in.
- Server-side IST (Asia/Kolkata) timestamps.
- 09:00–09:30 on-time; after 09:30 is late + penalty.
- Under 9 hours worked is half-day.
- Checkout requires a same-day check-in and cannot be repeated.
- Gmail SMTP notifications to unlimited configured recipients.
- Admin-only employee CRUD, employment details, emergency contacts and ID validity.
- Private Supabase Storage for attendance photos and employee documents.
- Week-off calendar and company holiday calendar.
- Automatic missing-record/absent generation for a date range.
- Date/employee/status/penalty reporting with CSV, Excel and PDF exports.
- Printable employee ID cards.
- Audit-log and notification-log foundations.
- Company identity, logo URL, contact details and attendance-rule settings.

## Supabase setup
1. Create a Supabase project.
2. Run `supabase/schema.sql` in SQL Editor.
3. Create private Storage buckets named `attendance-photos` and `employee-documents`.
4. Set `ADMIN_PANEL_PASSWORD` in `.env.local` and your hosting environment. Admin access uses this password only; no Supabase Auth user is needed.
5. Optionally set a separate random `ADMIN_SESSION_SECRET` for session signing.
6. Add the values from `.env.example` to local `.env.local` and Vercel Project Settings → Environment Variables.

## Gmail
Enable 2-Step Verification on the sending Gmail account, create a Gmail App Password, and set `GMAIL_USER` and `GMAIL_APP_PASSWORD` in Vercel. Do not put the password in the database or frontend. Set recipients under Admin → Company & Gmail.

## Run locally
```bash
npm install
npm run dev
```
Open `/` for public attendance and `/admin/login` for administration.

## Vercel
Import the repository, add all environment variables, deploy, then test camera permissions over HTTPS.

## Production hardening checklist
- Use private Storage buckets and signed URLs for any document viewer you add.
- Configure backups and retention policies for attendance photos/documents.
- Add your legal/privacy notice and employee consent policy for camera captures.
- Test timezone/date boundaries around midnight IST and DST-free reporting assumptions.
- Consider SSO/MFA for administrators.
- Review HR/data-retention requirements before storing identity documents.

## Attendance flow
- Home → Check In → type at least two characters of employee ID/mobile → select profile → confirm details → capture/retake live photo → Check In.
- Home → Check Out → search/select profile → confirm details → capture/retake live photo → Check Out.
- Attendance is saved in `attendance`; check-in photos are stored in the private `attendance-photos` bucket. PostgreSQL computes `worked_minutes`.
- Late and half-day rules use company settings. Duplicate submissions are rejected.
- Email uses Admin → Settings & SMTP (with environment credential fallback). Admin → Email Notifications shows sent, skipped and failed attempts. An email failure does not undo saved attendance.
- Camera access on phones/tablets requires an HTTPS deployment; localhost works on the same computer.

Run regression checks with `npm test` and a production compile with `npm run build`.

### Existing database upgrade
Run `supabase/migrations/20260914_attendance_setup.sql` in your Supabase SQL Editor if SMTP columns are missing. Then save the SMTP username, app password and recipient addresses in Admin → Settings & SMTP and use Test Email. Creating pages alone cannot send email until these values are configured.

## Admin access and responsive UI
Admin login uses only `ADMIN_PANEL_PASSWORD`, read on the server. Successful login issues an HttpOnly signed session valid for 12 hours; changing the password invalidates existing sessions. The same session protects all admin APIs. Sign out is available in the sidebar. Failed login attempts are limited per server process.

The interface uses a locally hosted Manrope variable font. Public cards and forms adapt to small screens; the admin sidebar becomes a drawer below 1024px. Tables scroll within their own panels and inputs use mobile-friendly sizing.

## Photos, employee documents and branding
- Admin → Attendance → View shows the employee, check-in/checkout timestamps in IST, hours, status and captured photos. Older records without photos show an explicit empty state.
- Admin → Employees → View shows employee details, all attached documents and recent attendance. Media downloads require an active admin session; attendance photos and documents remain in private buckets.
- Attendance emails embed available check-in and checkout JPEGs as CID attachments and show the recorded timestamps in IST. No expiring public photo URLs are used in emails.
- Admin → Settings & SMTP → Upload company logo accepts PNG/JPEG/WebP up to 2 MB and saves immediately. Company logos are public brand assets in the separate `company-assets` bucket. Company name and logo appear in the employee portal and admin navigation.
