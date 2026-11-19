<?php
/*
 * Private configuration for NindoHost / cPanel shared hosting.
 *
 * 1. Copy this file to your HOME folder, NEXT TO public_html (NOT inside it):
 *        /home/YOUR_CPANEL_USER/amjad-config.php
 * 2. Replace YOUR_CPANEL_USER below and set a random setup token.
 * 3. Open https://YOUR-DOMAIN/admin/setup.php and create the admin account.
 * 4. Delete the AMJAD_SETUP_TOKEN line afterwards.
 *
 * Evaluation answers are then saved in:
 *        /home/YOUR_CPANEL_USER/amjad-storage/evaluations/responses/
 * (outside the website, so nobody can open them from a browser).
 * Do not commit the real file to git.
 */
return array(
    'AMJAD_STORAGE_DIR' => '/home/YOUR_CPANEL_USER/amjad-storage',

    // One-time token for admin/setup.php (16+ random characters). Remove after setup.
    'AMJAD_SETUP_TOKEN' => 'change-me-to-a-long-random-value',

    'AMJAD_DEBUG' => '0',
);
