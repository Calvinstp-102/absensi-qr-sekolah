-- Modul 7 (Log Aktivitas): index untuk filter periode & jenis aktivitas (aditif)
CREATE INDEX `audit_logs_date_created_idx` ON `audit_logs`(`date_created`);

-- CreateIndex
CREATE INDEX `audit_logs_action_type_date_created_idx` ON `audit_logs`(`action_type`, `date_created`);
