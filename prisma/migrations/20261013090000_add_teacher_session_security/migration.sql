-- AlterTable
ALTER TABLE `teachers` ADD COLUMN `last_login_at` DATETIME(3) NULL,
    ADD COLUMN `session_version` INTEGER NOT NULL DEFAULT 0;
