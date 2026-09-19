# Emails

The outbox worker sends event-specific title/body through a shared React Email layout that escapes text. SMTP uses Mailpit locally; Resend supports production; the console-named test provider collects bounded messages without logging codes/contact details. There is no arbitrary email HTTP endpoint.

Resend gets notification ID as idempotency key. SMTP Message-ID is stable but does not guarantee deduplication. Auth links use frontend URL fragments. Extend the shared layout or add event-specific layouts without changing the worker interface.
