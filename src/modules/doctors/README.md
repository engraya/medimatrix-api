# Doctors

Public list/detail with strict active filtering. Admins create/edit/deactivate; DELETE preserves historical bookings. Slugs are unique. Seed upserts the nine doctors. Patient/appointment transactions recheck active references. Administrative mutations are audited; missing references return DOCTOR_NOT_FOUND.
