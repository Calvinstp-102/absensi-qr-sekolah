-- CreateTable
CREATE TABLE `qr_token_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_id` INTEGER NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `status` ENUM('active', 'grace_period', 'expired') NOT NULL DEFAULT 'active',
    `generated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `grace_period_until` DATETIME(3) NULL,
    `generated_by` INTEGER NOT NULL,
    `reason` VARCHAR(191) NULL,

    UNIQUE INDEX `qr_token_history_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendances` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_id` INTEGER NOT NULL,
    `tanggal` DATE NOT NULL,
    `jam_masuk_asli` DATETIME(3) NULL,
    `jam_pulang_asli` DATETIME(3) NULL,
    `status_utama` ENUM('hadir', 'terlambat', 'tidak_hadir') NOT NULL,
    `status_koreksi` ENUM('dimaklumi') NULL,
    `alasan_koreksi` VARCHAR(191) NULL,
    `dikoreksi_oleh` INTEGER NULL,
    `dikoreksi_at` DATETIME(3) NULL,
    `device_info` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `attendances_student_id_tanggal_key`(`student_id`, `tanggal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_class_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_id` INTEGER NOT NULL,
    `kelas` VARCHAR(191) NOT NULL,
    `tahun_ajaran` VARCHAR(191) NOT NULL,
    `action` ENUM('masuk_baru', 'naik_kelas', 'pindah_kelas') NOT NULL,
    `reason` VARCHAR(191) NULL,
    `changed_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teacher_id` INTEGER NOT NULL,
    `action_type` VARCHAR(191) NOT NULL,
    `entity_type` VARCHAR(191) NOT NULL,
    `entity_id` INTEGER NOT NULL,
    `before_value` JSON NULL,
    `after_value` JSON NULL,
    `reason` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `settings` (
    `key` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `qr_token_history` ADD CONSTRAINT `qr_token_history_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `qr_token_history` ADD CONSTRAINT `qr_token_history_generated_by_fkey` FOREIGN KEY (`generated_by`) REFERENCES `teachers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendances` ADD CONSTRAINT `attendances_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendances` ADD CONSTRAINT `attendances_dikoreksi_oleh_fkey` FOREIGN KEY (`dikoreksi_oleh`) REFERENCES `teachers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_class_history` ADD CONSTRAINT `student_class_history_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_class_history` ADD CONSTRAINT `student_class_history_changed_by_fkey` FOREIGN KEY (`changed_by`) REFERENCES `teachers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_teacher_id_fkey` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
