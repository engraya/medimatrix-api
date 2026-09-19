# Authentication

Routes wire schemas to services. Services own staff lockout, patient OTP, account tokens and replay detection. token.service signs JWTs/sets cookies; the repository exposes a public projection without credentials or counters.

Patient codes go to stored email: ten-minute expiry, five tries, three sends per identity per fifteen minutes. Failed attempts commit before errors return. Refresh rotation/revocation is serializable. Reset/role changes invalidate sessions. Invites reuse password setup; auth notification bodies are encrypted in the outbox.

Authenticated phone verification uses the same expiry/attempt/quota limits with purpose PHONE_VERIFY. Appointment SMS requires phoneVerifiedAt; changing the phone invalidates all outstanding phone challenges.

Errors: INVALID_CREDENTIALS, LOCKED, REFRESH_INVALID, OTP_INVALID, OTP_EXPIRED, OTP_ATTEMPTS_EXCEEDED, TOKEN_EXPIRED. Add identity channels only with a verified contact-binding policy. See docs/api for cookie semantics.
