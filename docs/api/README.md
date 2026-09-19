# API guide

Base URL: `http://localhost:4000/api/v1`. Request bodies are strict JSON; unknown keys fail validation. All mutations require `X-Requested-With: fetch`. Browsers must send cookies with `credentials: 'include'` and use an allowed Origin. Tools may use `Authorization: Bearer <access token>` but still need the mutation header. Auth endpoints issue HTTP-only cookies and do not expose tokens in JSON.

Success: `{ "success": true, "data": ..., "message": "OK", "meta": ... }`. Failure: `{ "success": false, "error": { "code": "...", "message": "...", "details": [...] }, "requestId": "..." }`.

`POST` creates return 201; action routes return 200. Validation 400; authentication 401; authorization/CSRF 403; absent or unowned resource 404; conflict/state violation 409; expired token 410; oversized upload 413; invalid file format 415; lockout 423; throttling 429; database unavailable 503.

## Endpoints

| Module         | Operations                                                                                                                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Health         | GET `/health/live`, `/health/ready` (also available without `/api/v1`)                                                                                                                                                               |
| Doctors        | GET `/doctors?active=true`, `/doctors/:id`; ADMIN POST `/doctors`, PATCH/DELETE `/doctors/:id`                                                                                                                                       |
| Authentication | POST `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/patient/start`, `/auth/patient/verify`, `/auth/phone/start`, `/auth/phone/verify`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email`; GET `/auth/me` |
| Users          | GET/PATCH `/users/me`; ADMIN GET `/users`, POST `/users/staff`, PATCH `/users/:id/role`                                                                                                                                              |
| Patients       | PATIENT POST `/patients`, GET `/patients/me`; owner/staff GET/PATCH `/patients/:id`; STAFF/ADMIN GET `/patients`                                                                                                                     |
| Appointments   | PATIENT POST `/appointments`; scoped GET `/appointments`, `/appointments/:id`; STAFF/ADMIN GET `/appointments/stats`, PATCH `/appointments/:id/schedule`; owner-pending/staff PATCH `/appointments/:id/cancel`                       |
| Files          | POST `/files` multipart field `file`; owner/staff GET `/files/:id/url`; signed local GET `/files/:id/download`                                                                                                                       |
| Notifications  | GET `/notifications`; PATCH `/notifications/:id/read`; POST `/notifications/read-all`; GET/PUT `/notifications/preferences`                                                                                                          |
| Documentation  | GET `/docs`, `/docs/openapi.json` (ADMIN in production)                                                                                                                                                                              |

List pagination uses `page=1&limit=20`, maximum limit 100. Invalid limits are rejected. Appointment filters: `status`, `doctorId`, `patientId`, ISO `from`/`to`, and `sort` (`schedule`, `-schedule`, `createdAt`, `-createdAt`, `-createdAt,schedule`). Patient and user searches accept `q`; user search also accepts `role`. Patient scope is always applied even if query parameters name a different patient.

## Patient journey

1. POST `/auth/patient/start` with `{name,email,phone}`. A six-digit code goes to the stored **email**; inspect Mailpit locally. Existing contact details are not overwritten. The response includes `{userId,channel,registered}`.
2. POST `/auth/patient/verify` with `{userId,code}`. Code expires after ten minutes and allows five attempts. Store the returned cookies automatically in the browser.
3. Optionally verify the stored phone for SMS: authenticated POST `/auth/phone/start`, then POST `/auth/phone/verify` with `{code}`. Appointment SMS is skipped until verified; email and inbox remain available. Then optionally POST a document to `/files`; retain its `id`.
4. POST `/patients` with the following payload. All three consents must be literal `true`.

```json
{
  "birthDate": "1994-04-02",
  "gender": "OTHER",
  "address": "12 Example Road",
  "occupation": "Engineer",
  "emergencyContactName": "Example Contact",
  "emergencyContactNumber": "+2348012345678",
  "insuranceProvider": "Example Insurance",
  "insurancePolicyNumber": "POLICY-123",
  "treatmentConsent": true,
  "disclosureConsent": true,
  "privacyConsent": true
}
```

Optional fields: `primaryDoctorId`, `allergies`, `currentMedication`, `familyMedicalHistory`, `pastMedicalHistory`, `identificationType`, `identificationNumber`, `identificationDocumentId`. Doctor IDs must name active doctors. Document IDs must belong to the patient. Birth dates use `YYYY-MM-DD`; appointments use ISO datetimes with timezone offsets.

5. POST `/appointments` with `{doctorId,schedule,reason,note?}`; the server sets `PENDING`.
6. Staff log in via `/auth/login`, view the dashboard and PATCH `/:id/schedule` with `{doctorId,schedule,note?}` or `/:id/cancel` with `{cancellationReason}`.

## Authentication details

Access cookie path `/api/v1`; refresh cookie path `/api/v1/auth` so logout receives it. Access tokens default to 15 minutes; refresh tokens 30 days. Logout revokes refresh and clears cookies; a previously copied access token can remain valid until its expiry. Password reset, refresh reuse detection and role changes also invalidate access via the user's session version. Refresh calls must be serialized; a racing old token triggers replay detection.

Forgot-password always returns 200 for syntactically valid requests subject to throttling. Staff invitations reuse the reset flow. Email links carry tokens in the URL fragment so reverse proxies do not log them; the frontend reads the fragment and posts the token to the API. Patient OTP verifies the email directly. `issueAccountToken` also supports an EMAIL_VERIFY flow for future email changes; there is no unauthenticated arbitrary email-change endpoint.

Role changes are restricted to STAFF↔ADMIN; at least one admin must remain. Patient identities cannot be promoted to staff through this endpoint.

## Notifications and files

Inbox only exposes the current user's delivered IN_APP rows. Preferences are an array of `{type,channel,enabled}`. Authentication messages ignore preferences. Appointment SMS requires a verified phone; changing phone clears verification and invalidates outstanding phone codes. Fake SMS is a bounded in-memory collector for automated tests, not a public development inbox; configure Twilio for manual phone-verification testing. OTP email is visible in Mailpit; test email messages use a separate bounded collector.

Download URLs expire after five minutes and confer access to the holder; treat them as credentials. Uploads are attachment-only, checked by MIME declaration and magic bytes, and never placed in a public bucket. Magic-byte checking is not antivirus scanning. If adding broader document handling, put quarantine/scanning before clinical use.

Generated OpenAPI contains input schemas and shared response envelopes. Domain response shapes are currently described here and exercised in tests rather than exhaustively modeled as OpenAPI response DTOs.
