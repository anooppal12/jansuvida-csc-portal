-- JANSUVIDA initial relational schema
-- Import into MySQL when moving from static prototype to backend.
CREATE DATABASE IF NOT EXISTS jansuvida CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE jansuvida;

CREATE TABLE IF NOT EXISTS customers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  mobile VARCHAR(10) NOT NULL UNIQUE,
  email VARCHAR(190) NULL,
  password_hash VARCHAR(255) NULL,
  status ENUM('active','blocked') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_categories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL UNIQUE,
  status TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS services (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id BIGINT UNSIGNED NULL,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(180) NOT NULL UNIQUE,
  description TEXT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  processing_time VARCHAR(100) NULL,
  status TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_services_category FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS applications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id BIGINT UNSIGNED NOT NULL,
  service_id BIGINT UNSIGNED NOT NULL,
  application_no VARCHAR(30) NOT NULL UNIQUE,
  status ENUM('pending','processing','approved','rejected','completed') NOT NULL DEFAULT 'pending',
  remarks TEXT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_app_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_app_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS documents (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  application_id BIGINT UNSIGNED NOT NULL,
  document_type VARCHAR(120) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  status ENUM('uploaded','verified','rejected') NOT NULL DEFAULT 'uploaded',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_documents_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  application_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  method VARCHAR(40) NOT NULL,
  transaction_id VARCHAR(150) NULL,
  status ENUM('pending','success','failed','refunded') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

INSERT IGNORE INTO service_categories (name, slug) VALUES
('Identity Services','identity'),('Government Schemes','government-schemes'),('Banking','banking'),('Insurance','insurance'),('Agriculture','agriculture'),('Loans','loans');

INSERT IGNORE INTO services (category_id,name,slug,description) SELECT id,'Aadhaar Services','aadhaar-services','Aadhaar related digital services' FROM service_categories WHERE slug='identity';
INSERT IGNORE INTO services (category_id,name,slug,description) SELECT id,'PAN Card','pan-card','New PAN and correction services' FROM service_categories WHERE slug='identity';
INSERT IGNORE INTO services (category_id,name,slug,description) SELECT id,'PM Kisan','pm-kisan','PM Kisan registration and related services' FROM service_categories WHERE slug='government-schemes';
INSERT IGNORE INTO services (category_id,name,slug,description) SELECT id,'Ayushman Bharat','ayushman-bharat','Ayushman beneficiary services' FROM service_categories WHERE slug='government-schemes';
INSERT IGNORE INTO services (category_id,name,slug,description) SELECT id,'AEPS / Banking','aeps-banking','AEPS and banking assistance' FROM service_categories WHERE slug='banking';
INSERT IGNORE INTO services (category_id,name,slug,description) SELECT id,'Insurance','insurance','Life, health, vehicle and crop insurance assistance' FROM service_categories WHERE slug='insurance';
INSERT IGNORE INTO services (category_id,name,slug,description) SELECT id,'Farmer Registry','farmer-registry','Agriculture and farmer registry services' FROM service_categories WHERE slug='agriculture';
INSERT IGNORE INTO services (category_id,name,slug,description) SELECT id,'CM Yuva Loan','cm-yuva-loan','Business and self-employment loan assistance' FROM service_categories WHERE slug='loans';
