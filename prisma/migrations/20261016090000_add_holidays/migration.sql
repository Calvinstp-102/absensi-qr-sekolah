-- Modul 3 (Pengaturan): tabel hari libur (aditif)
CREATE TABLE `holidays` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(191) NOT NULL,
    `tanggal_mulai` DATE NOT NULL,
    `tanggal_selesai` DATE NOT NULL,
    `keterangan` VARCHAR(150) NOT NULL,
    `jenjang` VARCHAR(20) NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,
    `deleted` BOOLEAN NOT NULL DEFAULT false,
    `date_created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `date_modified` DATETIME(3) NOT NULL,

    UNIQUE INDEX `holidays_uuid_key`(`uuid`),
    INDEX `holidays_deleted_tanggal_mulai_tanggal_selesai_idx`(`deleted`, `tanggal_mulai`, `tanggal_selesai`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `holidays` ADD CONSTRAINT `holidays_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `teachers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `holidays` ADD CONSTRAINT `holidays_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `teachers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
