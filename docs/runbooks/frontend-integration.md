# Frontend integration

The external frontend is untouched. Copy `examples/frontend/api-client.ts` into lib/api and set NEXT_PUBLIC_API_URL to `http://localhost:4000/api/v1`. Match API CORS_ORIGINS to the frontend. Production uses same-site HTTPS domains and suitable cookie settings.

| Flow                 | API                                                                      |
| -------------------- | ------------------------------------------------------------------------ |
| Initial patient form | patient/start, new OTP screen, patient/verify                            |
| SMS opt-in           | Authenticated auth/phone/start then auth/phone/verify with the SMS code  |
| Registration         | Optional files upload, then patients with document ID/consents           |
| Doctor selection     | doctors UUIDs instead of name constants                                  |
| Booking              | appointments with future ISO datetime and timezone                       |
| Admin modal          | Replace passkey with auth/login                                          |
| Dashboard            | appointments + appointments/stats with server pagination                 |
| Schedule/cancel      | appointments/:id/schedule or /cancel                                     |
| Notifications        | inbox/read/read-all/preferences                                          |
| Invitation/reset     | Read fragment token, clear browser history fragment, POST reset-password |

Map validation details to fields. Serialize refresh calls; the sample handles concurrency in one tab, while cross-tab coordination may also be needed. Next.js server fetches must explicitly forward approved cookies; never cache patient responses. UI middleware is not a substitute for API authorization.

Use the frontend feature flag, validate patient/staff journeys, then remove old server actions. Existing frontend DTO compatibility and cutover have not been tested.
