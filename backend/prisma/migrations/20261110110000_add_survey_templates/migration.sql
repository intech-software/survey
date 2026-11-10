-- CreateTable
CREATE TABLE `survey_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `description` TEXT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `survey_templates_status_idx`(`status`),
    INDEX `survey_templates_created_by_id_idx`(`created_by_id`),
    UNIQUE INDEX `survey_templates_code_version_key`(`code`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `survey_template_stages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `survey_template_id` INTEGER NOT NULL,
    `stage_name` VARCHAR(255) NOT NULL,
    `stage_order` INTEGER NOT NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `survey_template_stages_created_by_id_idx`(`created_by_id`),
    UNIQUE INDEX `survey_template_stages_template_order_key`(`survey_template_id`, `stage_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `survey_template_steps` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `survey_template_stage_id` INTEGER NOT NULL,
    `step_name` VARCHAR(255) NOT NULL,
    `step_order` INTEGER NOT NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `survey_template_steps_created_by_id_idx`(`created_by_id`),
    UNIQUE INDEX `survey_template_steps_stage_order_key`(`survey_template_stage_id`, `step_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `survey_template_parameters` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `survey_template_step_id` INTEGER NOT NULL,
    `parameter_name` VARCHAR(255) NOT NULL,
    `data_type` VARCHAR(30) NOT NULL,
    `unit` VARCHAR(50) NULL,
    `requirement` TEXT NOT NULL,
    `parameter_order` INTEGER NOT NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `survey_template_parameters_created_by_id_idx`(`created_by_id`),
    UNIQUE INDEX `survey_template_parameters_step_order_key`(`survey_template_step_id`, `parameter_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `survey_templates` ADD CONSTRAINT `survey_templates_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `survey_template_stages` ADD CONSTRAINT `survey_template_stages_template_id_fkey` FOREIGN KEY (`survey_template_id`) REFERENCES `survey_templates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `survey_template_stages` ADD CONSTRAINT `survey_template_stages_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `survey_template_steps` ADD CONSTRAINT `survey_template_steps_stage_id_fkey` FOREIGN KEY (`survey_template_stage_id`) REFERENCES `survey_template_stages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `survey_template_steps` ADD CONSTRAINT `survey_template_steps_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `survey_template_parameters` ADD CONSTRAINT `survey_template_parameters_step_id_fkey` FOREIGN KEY (`survey_template_step_id`) REFERENCES `survey_template_steps`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `survey_template_parameters` ADD CONSTRAINT `survey_template_parameters_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
