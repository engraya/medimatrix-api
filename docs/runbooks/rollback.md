# Rollback

Record prior immutable image tags. Set API_IMAGE back to the last healthy tag, pull and recreate the API service, then verify readiness and an authenticated synthetic journey. Keep the database if the older image is schema-compatible.

Do not automatically reverse migrations or reset the database. Data/schema rollback needs a verified backup, outage window and assessment of writes since backup. Restore to a fresh database first. Preserve audit evidence without copying patient data into tickets.

External notifications may have been delivered before rollback; database restoration cannot undo email/SMS.
