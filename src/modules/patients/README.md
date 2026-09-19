# Patients

One profile per user, enforced in PostgreSQL. Registration requires three literal consents, stores timestamps and checks document ownership. Scoped reads/updates return 404 for cross-patient probes. Staff access is audited without medical snapshots. Registration emits WELCOME in the same transaction.

Patches cannot alter owner, consent timestamps or lifecycle fields. No hard-delete route exists. Errors include ALREADY_REGISTERED, NOT_REGISTERED and DOCTOR_NOT_FOUND. See docs/api for registration fields.
