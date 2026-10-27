-- Lead capture schema (MySQL 5.7+ / 8.x)
CREATE TABLE IF NOT EXISTS leads (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name        VARCHAR(100)  NOT NULL,
  email            VARCHAR(254)  NOT NULL,
  phone            VARCHAR(30)   NOT NULL,
  interest         ENUM('buy','sell','rent','invest','other') NOT NULL,
  property_type    VARCHAR(30)   NULL,
  budget           VARCHAR(30)   NULL,
  preferred_contact ENUM('email','phone','either') NOT NULL DEFAULT 'either',
  message          TEXT          NULL,
  consent          TINYINT(1)    NOT NULL DEFAULT 0,
  source_page      VARCHAR(255)  NULL,
  ip_address       VARCHAR(45)   NULL,
  user_agent       VARCHAR(255)  NULL,
  notification_status ENUM('pending','sent','failed','skipped') NOT NULL DEFAULT 'pending',
  notification_error  VARCHAR(500) NULL,
  created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_leads_email (email),
  KEY idx_leads_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
