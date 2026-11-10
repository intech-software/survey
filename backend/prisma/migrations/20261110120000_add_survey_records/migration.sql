-- CreateTable
CREATE TABLE `survey_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `survey_template_id` INTEGER NULL,
    `template_code` VARCHAR(50) NOT NULL,
    `template_name` VARCHAR(255) NOT NULL,
    `template_version` INTEGER NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `project` VARCHAR(255) NULL,
    `location` VARCHAR(255) NULL,
    `survey_date` DATE NULL,
    `description` TEXT NULL,
    `created_by_id` INTEGER NOT NULL,
    `checked_by_id` INTEGER NULL,
    `checked_at` DATETIME(3) NULL,
    `approved_by_id` INTEGER NULL,
    `approved_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `survey_records_template_id_idx`(`survey_template_id`),
    INDEX `survey_records_created_by_idx`(`created_by_id`),
    INDEX `survey_records_checked_by_idx`(`checked_by_id`),
    INDEX `survey_records_approved_by_idx`(`approved_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `survey_record_stages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `survey_record_id` INTEGER NOT NULL,
    `source_template_stage_id` INTEGER NULL,
    `stage_name` VARCHAR(255) NOT NULL,
    `stage_order` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `survey_record_stages_order_key`(`survey_record_id`, `stage_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `survey_record_steps` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `survey_record_stage_id` INTEGER NOT NULL,
    `source_template_step_id` INTEGER NULL,
    `step_name` VARCHAR(255) NOT NULL,
    `step_order` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `survey_record_steps_order_key`(`survey_record_stage_id`, `step_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `survey_record_parameters` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `survey_record_step_id` INTEGER NOT NULL,
    `source_template_parameter_id` INTEGER NULL,
    `parameter_name` VARCHAR(255) NOT NULL,
    `data_type` VARCHAR(30) NOT NULL,
    `unit` VARCHAR(50) NULL,
    `requirement` TEXT NOT NULL,
    `parameter_order` INTEGER NOT NULL,
    `result_value` TEXT NULL,
    `note` TEXT NULL,
    `result_image_path` TEXT NULL,
    `recorded_by_id` INTEGER NULL,
    `recorded_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `survey_record_parameters_recorder_idx`(`recorded_by_id`),
    UNIQUE INDEX `survey_record_parameters_order_key`(`survey_record_step_id`, `parameter_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `survey_records` ADD CONSTRAINT `survey_records_template_id_fkey` FOREIGN KEY (`survey_template_id`) REFERENCES `survey_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `survey_records` ADD CONSTRAINT `survey_records_created_by_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `survey_records` ADD CONSTRAINT `survey_records_checked_by_fkey` FOREIGN KEY (`checked_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `survey_records` ADD CONSTRAINT `survey_records_approved_by_fkey` FOREIGN KEY (`approved_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `survey_record_stages` ADD CONSTRAINT `survey_record_stages_record_id_fkey` FOREIGN KEY (`survey_record_id`) REFERENCES `survey_records`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `survey_record_steps` ADD CONSTRAINT `survey_record_steps_stage_id_fkey` FOREIGN KEY (`survey_record_stage_id`) REFERENCES `survey_record_stages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `survey_record_parameters` ADD CONSTRAINT `survey_record_parameters_step_id_fkey` FOREIGN KEY (`survey_record_step_id`) REFERENCES `survey_record_steps`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `survey_record_parameters` ADD CONSTRAINT `survey_record_parameters_recorder_fkey` FOREIGN KEY (`recorded_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
