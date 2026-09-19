CREATE EXTENSION IF NOT EXISTS citext;
CREATE TYPE "UserRole" AS ENUM ('PATIENT', 'STAFF', 'ADMIN');
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'SCHEDULED', 'CANCELLED');
CREATE TYPE "IdentificationType" AS ENUM ('BIRTH_CERTIFICATE', 'DRIVERS_LICENSE', 'MEDICAL_INSURANCE_CARD', 'MILITARY_ID', 'NATIONAL_ID', 'PASSPORT', 'RESIDENT_ALIEN_CARD', 'SOCIAL_SECURITY_CARD', 'STATE_ID', 'STUDENT_ID', 'VOTER_ID');
CREATE TYPE "NotificationType" AS ENUM ('APPOINTMENT_REQUESTED', 'APPOINTMENT_SCHEDULED', 'APPOINTMENT_CANCELLED', 'WELCOME', 'EMAIL_VERIFICATION', 'PASSWORD_RESET', 'OTP', 'STAFF_INVITE');
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS');
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'SKIPPED');
CREATE TYPE "VerificationPurpose" AS ENUM ('EMAIL_VERIFY', 'PASSWORD_RESET', 'LOGIN_OTP', 'PHONE_VERIFY');

CREATE TABLE "users" (
  "id" UUID NOT NULL, "email" CITEXT NOT NULL, "phone" TEXT NOT NULL, "name" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'PATIENT', "password_hash" TEXT,
  "session_version" INTEGER NOT NULL DEFAULT 0, "login_failures" INTEGER NOT NULL DEFAULT 0,
  "locked_until" TIMESTAMP(3), "login_window_at" TIMESTAMP(3),
  "email_verified_at" TIMESTAMP(3), "phone_verified_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL, "deleted_at" TIMESTAMP(3),
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
CREATE INDEX "users_role_idx" ON "users"("role");

CREATE TABLE "doctors" (
  "id" UUID NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "image_url" TEXT NOT NULL,
  "specialty" TEXT, "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "doctors_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "doctors_slug_key" ON "doctors"("slug");
CREATE INDEX "doctors_is_active_idx" ON "doctors"("is_active");

CREATE TABLE "files" (
  "id" UUID NOT NULL, "owner_user_id" UUID NOT NULL, "bucket" TEXT NOT NULL, "storage_key" TEXT NOT NULL,
  "original_name" TEXT NOT NULL, "mime_type" TEXT NOT NULL, "size_bytes" INTEGER NOT NULL, "checksum_sha256" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "files_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "files_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "files_size_check" CHECK ("size_bytes" > 0 AND "size_bytes" <= 5242880)
);
CREATE UNIQUE INDEX "files_storage_key_key" ON "files"("storage_key");
CREATE INDEX "files_owner_user_id_idx" ON "files"("owner_user_id");

CREATE TABLE "patients" (
  "id" UUID NOT NULL, "user_id" UUID NOT NULL, "birth_date" DATE NOT NULL, "gender" "Gender" NOT NULL,
  "address" TEXT NOT NULL, "occupation" TEXT NOT NULL, "emergency_contact_name" TEXT NOT NULL, "emergency_contact_number" TEXT NOT NULL,
  "primary_doctor_id" UUID, "insurance_provider" TEXT NOT NULL, "insurance_policy_number" TEXT NOT NULL,
  "allergies" TEXT, "current_medication" TEXT, "family_medical_history" TEXT, "past_medical_history" TEXT,
  "identification_type" "IdentificationType", "identification_number" TEXT, "identification_document_id" UUID,
  "treatment_consent_at" TIMESTAMP(3) NOT NULL, "disclosure_consent_at" TIMESTAMP(3) NOT NULL, "privacy_consent_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL, "deleted_at" TIMESTAMP(3),
  CONSTRAINT "patients_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "patients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "patients_primary_doctor_id_fkey" FOREIGN KEY ("primary_doctor_id") REFERENCES "doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "patients_identification_document_id_fkey" FOREIGN KEY ("identification_document_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "patients_user_id_key" ON "patients"("user_id");
CREATE UNIQUE INDEX "patients_identification_document_id_key" ON "patients"("identification_document_id");
CREATE INDEX "patients_primary_doctor_id_idx" ON "patients"("primary_doctor_id");

CREATE TABLE "appointments" (
  "id" UUID NOT NULL, "patient_id" UUID NOT NULL, "doctor_id" UUID NOT NULL, "schedule" TIMESTAMPTZ(3) NOT NULL,
  "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING', "reason" TEXT NOT NULL, "note" TEXT, "cancellation_reason" TEXT,
  "scheduled_at" TIMESTAMP(3), "scheduled_by_id" UUID, "cancelled_at" TIMESTAMP(3), "cancelled_by_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "appointments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "appointments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "appointments_scheduled_by_id_fkey" FOREIGN KEY ("scheduled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "appointments_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "appointments_cancellation_check" CHECK (("status" = 'CANCELLED') = ("cancellation_reason" IS NOT NULL)),
  CONSTRAINT "appointments_reason_length" CHECK (char_length("reason") BETWEEN 2 AND 500),
  CONSTRAINT "appointments_cancellation_length" CHECK ("cancellation_reason" IS NULL OR char_length("cancellation_reason") BETWEEN 2 AND 500)
);
CREATE INDEX "appointments_patient_id_schedule_idx" ON "appointments"("patient_id", "schedule");
CREATE INDEX "appointments_status_schedule_idx" ON "appointments"("status", "schedule");
CREATE INDEX "appointments_doctor_id_schedule_idx" ON "appointments"("doctor_id", "schedule");
CREATE INDEX "appointments_created_at_idx" ON "appointments"("created_at" DESC);

CREATE TABLE "refresh_tokens" (
  "id" UUID NOT NULL, "user_id" UUID NOT NULL, "token_hash" TEXT NOT NULL, "family_id" UUID NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL, "revoked_at" TIMESTAMP(3), "replaced_by_id" UUID, "user_agent" TEXT, "ip" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");

CREATE TABLE "verification_tokens" (
  "id" UUID NOT NULL, "user_id" UUID NOT NULL, "purpose" "VerificationPurpose" NOT NULL, "code_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL, "consumed_at" TIMESTAMP(3), "attempts" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "verification_tokens_user_id_purpose_idx" ON "verification_tokens"("user_id", "purpose");
CREATE INDEX "verification_tokens_expires_at_idx" ON "verification_tokens"("expires_at");

CREATE TABLE "notifications" (
  "id" UUID NOT NULL, "user_id" UUID NOT NULL, "type" "NotificationType" NOT NULL, "channel" "NotificationChannel" NOT NULL,
  "title" TEXT NOT NULL, "body" TEXT NOT NULL, "data" JSONB, "dedupe_key" TEXT NOT NULL,
  "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING', "attempts" INTEGER NOT NULL DEFAULT 0,
  "claimed_at" TIMESTAMP(3), "claim_id" UUID, "last_error" TEXT,
  "scheduled_for" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "sent_at" TIMESTAMP(3), "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "notifications_dedupe_key_key" ON "notifications"("dedupe_key");
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");
CREATE INDEX "notifications_status_scheduled_for_idx" ON "notifications"("status", "scheduled_for");

CREATE TABLE "notification_preferences" (
  "user_id" UUID NOT NULL, "type" "NotificationType" NOT NULL, "channel" "NotificationChannel" NOT NULL, "enabled" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id", "type", "channel"),
  CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "audit_logs" (
  "id" UUID NOT NULL, "actor_user_id" UUID, "action" TEXT NOT NULL, "entity_type" TEXT NOT NULL, "entity_id" TEXT NOT NULL,
  "before" JSONB, "after" JSONB, "request_id" TEXT, "ip" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");
CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs"("actor_user_id");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");
