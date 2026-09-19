# Appointments

Bookings start PENDING. Staff schedule/reschedule/cancel; patients cancel only their own PENDING booking. CANCELLED is terminal. Schedule/cancel atomically write audit/outbox records. Requests notify staff inboxes. Lists apply ownership before explicit filters and use joined summaries/bounded pagination; stats group in SQL. Staff reads are audited.

State conflicts return INVALID_TRANSITION; missing profiles NOT_REGISTERED; inactive doctors DOCTOR_NOT_FOUND. Notification dates use configured NOTIFICATION_TIMEZONE.
