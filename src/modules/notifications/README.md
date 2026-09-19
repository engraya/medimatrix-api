# Notifications

enqueue writes deduplicated outbox rows within caller transactions. Preferences apply except mandatory auth messages. Atomic SKIP LOCKED claims, two-minute leases and claim IDs protect concurrent processing and fence completion. Retry uses exponential backoff up to five attempts. External delivery is at least once; SMTP/Twilio duplicates remain possible after crashes.

Auth bodies are encrypted and scrubbed after completion/expiry/exhaustion. Inbox exposes only the caller's SENT IN_APP rows. Read/read-all are scoped; preferences have unique user/type/channel keys. Readiness includes heartbeat; consult incident docs before manual retries.
