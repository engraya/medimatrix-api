# Local development

Use the root README's first-run commands. Configure secrets before invoking TypeScript CLI tools: they use the same environment validation as the server. `POSTGRES_HOST=localhost` is for host development; Compose overrides it to `postgres`. DATABASE_URL is derived, not pasted.

Daily start: `docker compose up -d postgres minio createbuckets mailpit`, then `npm run dev`. Stop with `docker compose stop`; named volumes preserve data. OTP arrives in Mailpit on port 8025. Development seed admin credentials are optional and never overwrite existing passwords.

To create an admin in PowerShell without placing the password in command arguments:

```powershell
$securePassword = Read-Host 'Admin password' -AsSecureString
$env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $securePassword).Password
npm run create-admin
Remove-Item Env:\ADMIN_PASSWORD
```

Use `curl.exe -c cookies.txt -b cookies.txt` for cookie sessions, with `-H "X-Requested-With: fetch"` on mutations. Delete cookie files afterward. Leave COOKIE_DOMAIN empty on localhost.

Local storage mode avoids MinIO for focused development. Never expose LOCAL_STORAGE_DIR as static content. S3_PUBLIC_ENDPOINT must be browser-reachable; S3_ENDPOINT may be a Docker hostname.

For port conflicts change POSTGRES_PORT and recreate the database service. Internal container connections still use 5432. Environment password changes do not reinitialize an existing PostgreSQL volume; preserve its original credentials or explicitly provision a new database.
