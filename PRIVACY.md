# HomeLog — Privacy Policy

_Last updated: 2026-06-23_

> **Template.** This is a starting point, not legal advice. Review and adapt it (and have it
> reviewed) before publishing or submitting to an app store. App stores require a hosted,
> publicly reachable privacy-policy URL.

## Who we are

HomeLog ("we", "the app") helps homeowners track maintenance tasks, log expenses, and find
local service providers.

## Information we collect

- **Account information:** your name, email address, and password (stored only as a secure
  bcrypt hash — we never store or see your plaintext password).
- **Home details you provide:** nickname, type, size, year built, and location fields.
- **Content you create:** maintenance tasks, expenses, reviews, bookings, and any **images you
  upload** (e.g. receipt photos, profile avatars).
- **Technical data:** basic request logs (timestamp, route, status) used to operate and secure
  the service.

We do **not** sell your personal data.

## How we use your information

- To provide the app's features (your data is scoped to your account and only visible to you).
- To authenticate you and keep your session secure (JWTs).
- To operate, debug, and protect the service.

## Where your data is stored

- Application data is stored in **MongoDB** (e.g. MongoDB Atlas).
- Uploaded images are stored in **Supabase Storage**.
- Data may be processed by our hosting providers (e.g. Render) under their security terms.

## Data sharing

We share data only with the infrastructure providers needed to run the app (database, storage,
hosting) and where required by law. We do not share your data with advertisers.

## Data retention & deletion

We retain your data while your account is active. You can **delete your account and all
associated data at any time from within the app** (Profile → Danger zone → Delete account).
This immediately and permanently removes your tasks, expenses, bookings, reviews, and uploaded
images. You may also contact us to request deletion. Removal is subject to any legal retention
obligations.

## Security

Passwords are hashed with bcrypt; all data endpoints require authentication and are scoped to
the owning user. API traffic should be served over HTTPS/TLS in production. No method of
transmission or storage is 100% secure.

## Children's privacy

HomeLog is not directed to children under 13, and we do not knowingly collect their data.

## Changes to this policy

We may update this policy; material changes will be reflected by the "Last updated" date above.

## Contact

Questions or deletion requests: **<your-support-email@example.com>** (replace before publishing).
