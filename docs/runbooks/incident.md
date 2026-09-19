# Incident response

Correlate X-Request-Id with structured logs. HTTP serializers omit body, query strings, cookies and credentials. Sentry strips request/user/breadcrumb data and exception messages. Investigate by error code/entity identifier, not patient payload logging.

| Symptom            | Checks                                                                           |
| ------------------ | -------------------------------------------------------------------------------- |
| 503                | Database health, credentials, disk, pools, migrations                            |
| Refresh 401        | Cookie settings, serialized frontend refresh, family revocation/session versions |
| Mutation 403       | Allowed Origin, credentials mode, X-Requested-With header                        |
| Missing OTP        | Mailpit/provider, outbox, quota/expiry, stored email                             |
| Stale inbox        | Worker heartbeat, pending row age, stale leases and failures                     |
| Invalid S3 URL     | Public endpoint, clock skew, expiry and bucket policy                            |
| Duplicate delivery | Crash/lease recovery after provider acceptance                                   |

Check provider history before manually resetting individual FAILED rows. Broad replay can send stale appointment messages; regenerate expired auth messages. During database incidents preserve volumes and use the rollback/restore runbooks. For backup alerts verify actual object presence and restoreability.
