/*
  Warnings:

  - You are about to drop the column `created_at` on the `attendances` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `attendances` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `audit_logs` table. All the data in the column will be lost.
  - The primary key for the `settings` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `updated_at` on the `settings` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `student_class_history` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `foto_url` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `qr_token_aktif` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `teachers` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `teachers` table. All the data in the column will be lost.
  - You are about to drop the `qr_token_history` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[uuid]` on the table `attendances` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[uuid]` on the table `audit_logs` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[uuid]` on the table `settings` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[key]` on the table `settings` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[uuid]` on the table `student_class_history` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[uuid]` on the table `students` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nis]` on the table `students` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nisn]` on the table `students` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[uuid]` on the table `teachers` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `date_modified` to the `attendances` table without a default value. This is not possible if the table is not empty.
  - The required column `uuid` was added to the `attendances` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `date_modified` to the `audit_logs` table without a default value. This is not possible if the table is not empty.
  - The required column `uuid` was added to the `audit_logs` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `date_modified` to the `settings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id` to the `settings` table without a default value. This is not possible if the table is not empty.
  - The required column `uuid` was added to the `settings` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `date_modified` to the `student_class_history` table without a default value. This is not possible if the table is not empty.
  - The required column `uuid` was added to the `student_class_history` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `date_modified` to the `students` table without a default value. This is not possible if the table is not empty.
  - The required column `uuid` was added to the `students` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `date_modified` to the `teachers` table without a default value. This is not possible if the table is not empty.
  - The required column `uuid` was added to the `teachers` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- DropForeignKey
ALTER TABLE `qr_token_history` DROP FOREIGN KEY `qr_token_history_generated_by_fkey`;

-- DropForeignKey
ALTER TABLE `qr_token_history` DROP FOREIGN KEY `qr_token_history_student_id_fkey`;

-- DropIndex
DROP INDEX `students_qr_token_aktif_key` ON `students`;

-- AlterTable
ALTER TABLE `attendances` DROP COLUMN `created_at`,
    DROP COLUMN `updated_at`,
    ADD COLUMN `date_created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `date_modified` DATETIME(3) NOT NULL,
    ADD COLUMN `deleted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `uuid` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `audit_logs` DROP COLUMN `created_at`,
    ADD COLUMN `date_created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `date_modified` DATETIME(3) NOT NULL,
    ADD COLUMN `deleted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `uuid` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `settings` DROP PRIMARY KEY,
    DROP COLUMN `updated_at`,
    ADD COLUMN `date_created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `date_modified` DATETIME(3) NOT NULL,
    ADD COLUMN `deleted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD COLUMN `uuid` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `student_class_history` DROP COLUMN `created_at`,
    ADD COLUMN `date_created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `date_modified` DATETIME(3) NOT NULL,
    ADD COLUMN `deleted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `uuid` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `students` DROP COLUMN `created_at`,
    DROP COLUMN `foto_url`,
    DROP COLUMN `qr_token_aktif`,
    DROP COLUMN `updated_at`,
    ADD COLUMN `alamat` VARCHAR(191) NULL,
    ADD COLUMN `date_created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `date_modified` DATETIME(3) NOT NULL,
    ADD COLUMN `deleted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `foto_path` VARCHAR(191) NULL,
    ADD COLUMN `has_qr` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `nama_ortu` VARCHAR(191) NULL,
    ADD COLUMN `nis` VARCHAR(191) NULL,
    ADD COLUMN `nisn` VARCHAR(191) NULL,
    ADD COLUMN `no_hp_ortu` VARCHAR(191) NULL,
    ADD COLUMN `tanggal_lahir` DATE NULL,
    ADD COLUMN `uuid` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `teachers` DROP COLUMN `created_at`,
    DROP COLUMN `updated_at`,
    ADD COLUMN `date_created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `date_modified` DATETIME(3) NOT NULL,
    ADD COLUMN `deleted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `foto_path` VARCHAR(191) NULL,
    ADD COLUMN `has_qr` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `no_hp` VARCHAR(191) NULL,
    ADD COLUMN `uuid` VARCHAR(191) NOT NULL;

-- DropTable
DROP TABLE `qr_token_history`;

-- CreateTable
CREATE TABLE `qr_codes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(191) NOT NULL,
    `related_to` ENUM('students', 'teachers') NOT NULL,
    `student_id` INTEGER NULL,
    `teacher_id` INTEGER NULL,
    `token` VARCHAR(191) NOT NULL,
    `status` ENUM('active', 'grace_period', 'expired') NOT NULL DEFAULT 'active',
    `generated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `grace_period_until` DATETIME(3) NULL,
    `generated_by` INTEGER NOT NULL,
    `reason` VARCHAR(191) NULL,
    `deleted` BOOLEAN NOT NULL DEFAULT false,
    `date_created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `date_modified` DATETIME(3) NOT NULL,

    UNIQUE INDEX `qr_codes_uuid_key`(`uuid`),
    UNIQUE INDEX `qr_codes_token_key`(`token`),
    INDEX `qr_codes_related_to_student_id_idx`(`related_to`, `student_id`),
    INDEX `qr_codes_related_to_teacher_id_idx`(`related_to`, `teacher_id`),
    INDEX `qr_codes_status_deleted_idx`(`status`, `deleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `attendances_uuid_key` ON `attendances`(`uuid`);

-- CreateIndex
CREATE INDEX `attendances_tanggal_status_utama_idx` ON `attendances`(`tanggal`, `status_utama`);

-- CreateIndex
CREATE INDEX `attendances_deleted_idx` ON `attendances`(`deleted`);

-- CreateIndex
CREATE UNIQUE INDEX `audit_logs_uuid_key` ON `audit_logs`(`uuid`);

-- CreateIndex
CREATE INDEX `audit_logs_entity_type_entity_id_idx` ON `audit_logs`(`entity_type`, `entity_id`);

-- CreateIndex
CREATE UNIQUE INDEX `settings_uuid_key` ON `settings`(`uuid`);

-- CreateIndex
CREATE UNIQUE INDEX `settings_key_key` ON `settings`(`key`);

-- CreateIndex
CREATE UNIQUE INDEX `student_class_history_uuid_key` ON `student_class_history`(`uuid`);

-- CreateIndex
CREATE INDEX `student_class_history_student_id_tahun_ajaran_idx` ON `student_class_history`(`student_id`, `tahun_ajaran`);

-- CreateIndex
CREATE UNIQUE INDEX `students_uuid_key` ON `students`(`uuid`);

-- CreateIndex
CREATE UNIQUE INDEX `students_nis_key` ON `students`(`nis`);

-- CreateIndex
CREATE UNIQUE INDEX `students_nisn_key` ON `students`(`nisn`);

-- CreateIndex
CREATE INDEX `students_jenjang_kelas_sekarang_idx` ON `students`(`jenjang`, `kelas_sekarang`);

-- CreateIndex
CREATE INDEX `students_status_idx` ON `students`(`status`);

-- CreateIndex
CREATE INDEX `students_deleted_idx` ON `students`(`deleted`);

-- CreateIndex
CREATE UNIQUE INDEX `teachers_uuid_key` ON `teachers`(`uuid`);

-- CreateIndex
CREATE INDEX `teachers_role_idx` ON `teachers`(`role`);

-- CreateIndex
CREATE INDEX `teachers_deleted_idx` ON `teachers`(`deleted`);

-- AddForeignKey
ALTER TABLE `qr_codes` ADD CONSTRAINT `qr_codes_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `qr_codes` ADD CONSTRAINT `qr_codes_teacher_id_fkey` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `qr_codes` ADD CONSTRAINT `qr_codes_generated_by_fkey` FOREIGN KEY (`generated_by`) REFERENCES `teachers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `audit_logs` RENAME INDEX `audit_logs_teacher_id_fkey` TO `audit_logs_teacher_id_idx`;
