# Secret rotation

JWT: move the prior key to JWT_SECRET_PREVIOUS, set a new independent JWT_SECRET, deploy, wait the maximum access-token TTL, then remove the old key. For compromise, increment affected users' session_version and revoke refresh tokens transactionally.

OTP_PEPPER protects code hashes, auth outbox encryption and local download signatures. Pause auth requests, drain/expire pending auth messages, replace it and restart. Outstanding codes/local URLs become invalid. Old ciphertext cannot decrypt with the new pepper.

Database: coordinate changing the actual PostgreSQL role password and both runtime/Compose env files. Editing POSTGRES_PASSWORD alone does not change initialized roles.

Providers: create minimum-privilege replacements, deploy, verify email/SMS/storage, then revoke old keys. Rotate backup credentials separately and verify a new backup. Never put keys in logs or tickets.
