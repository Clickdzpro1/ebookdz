-- EBOOKDZ Complete Database Schema
-- Phase 1: Core Tables with Admin Verification & Multi-Vendor Support

-- Drop existing tables if they exist (for fresh start)
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS slickpay_configs;
DROP TABLE IF EXISTS users;

-- Users table with approval system
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role ENUM('client', 'vendor', 'admin') DEFAULT 'client',
    status ENUM('pending', 'approved', 'rejected', 'suspended') DEFAULT 'pending',
    approved_by INT NULL,
    approved_at TIMESTAMP NULL,
    rejection_reason TEXT NULL,
    profile_image VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_email (email),
    INDEX idx_status (status),
    INDEX idx_role (role)
);

-- SlickPay API keys management (encrypted)
CREATE TABLE slickpay_configs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    api_key_encrypted TEXT NOT NULL,
    secret_key_encrypted TEXT NOT NULL,
    merchant_id VARCHAR(255),
    webhook_url VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    is_test_mode BOOLEAN DEFAULT true,
    last_tested_at TIMESTAMP NULL,
    test_status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_active (user_id, is_active)
);

-- Categories for books
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    slug VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Books with vendor ownership and approval system
CREATE TABLE books (
    id INT PRIMARY KEY AUTO_INCREMENT,
    vendor_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    author VARCHAR(255) NOT NULL,
    isbn VARCHAR(20),
    category_id INT,
    price DECIMAL(10,2) NOT NULL,
    cover_image VARCHAR(255),
    file_path VARCHAR(255),
    file_size INT,
    page_count INT,
    language ENUM('ar', 'fr', 'en', 'ber') DEFAULT 'ar',
    status ENUM('draft', 'pending', 'approved', 'rejected') DEFAULT 'draft',
    approved_by INT NULL,
    approved_at TIMESTAMP NULL,
    rejection_reason TEXT NULL,
    download_count INT DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.00,
    review_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_vendor (vendor_id),
    INDEX idx_status (status),
    INDEX idx_category (category_id),
    FULLTEXT idx_search (title, author, description)
);

-- Transactions with vendor tracking and commission
CREATE TABLE transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    transaction_uuid VARCHAR(36) UNIQUE NOT NULL,
    buyer_id INT NOT NULL,
    vendor_id INT NOT NULL,
    book_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    platform_commission DECIMAL(10,2) DEFAULT 0.00,
    vendor_payout DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'DZD',
    slickpay_transaction_id VARCHAR(255),
    slickpay_payment_url TEXT,
    status ENUM('pending', 'processing', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    payment_method VARCHAR(50),
    failure_reason TEXT NULL,
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    INDEX idx_buyer (buyer_id),
    INDEX idx_vendor (vendor_id),
    INDEX idx_status (status),
    INDEX idx_uuid (transaction_uuid)
);

-- User purchases (for download tracking)
CREATE TABLE user_purchases (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    book_id INT NOT NULL,
    transaction_id INT NOT NULL,
    download_count INT DEFAULT 0,
    last_downloaded_at TIMESTAMP NULL,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_purchase (user_id, book_id),
    INDEX idx_user (user_id)
);

-- Permission system for role-based access
CREATE TABLE permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    role VARCHAR(50) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    actions JSON NOT NULL, -- ['create', 'read', 'update', 'delete']
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_role_resource (role, resource)
);

-- User sessions for JWT token management
CREATE TABLE user_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    user_agent TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_token (token_hash),
    INDEX idx_expires (expires_at)
);

-- Reviews and ratings
CREATE TABLE book_reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    book_id INT NOT NULL,
    user_id INT NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    is_approved BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_book_review (user_id, book_id),
    INDEX idx_book (book_id),
    INDEX idx_rating (rating)
);

-- System settings
CREATE TABLE system_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert default categories
INSERT INTO categories (name, description, slug) VALUES
('Academic', 'Educational and academic books', 'academic'),
('Literature', 'Fiction and literature books', 'literature'),
('Professional', 'Business and professional development', 'professional'),
('Islamic', 'Islamic and religious books', 'islamic'),
('Children', 'Books for children and young adults', 'children'),
('Science', 'Science and technology books', 'science'),
('History', 'Historical books and documentaries', 'history'),
('Culture', 'Algerian culture and heritage', 'culture');

-- Insert default permissions
INSERT INTO permissions (role, resource, actions) VALUES
('client', 'books', '["read"]'),
('client', 'profile', '["read", "update"]'),
('client', 'transactions', '["read"]'),
('client', 'purchases', '["read"]'),
('client', 'reviews', '["create", "read", "update", "delete"]'),

('vendor', 'books', '["create", "read", "update", "delete"]'),
('vendor', 'profile', '["read", "update"]'),
('vendor', 'transactions', '["read"]'),
('vendor', 'slickpay', '["create", "read", "update", "delete"]'),
('vendor', 'analytics', '["read"]'),

('admin', 'users', '["create", "read", "update", "delete"]'),
('admin', 'books', '["create", "read", "update", "delete"]'),
('admin', 'categories', '["create", "read", "update", "delete"]'),
('admin', 'transactions', '["read"]'),
('admin', 'analytics', '["read"]'),
('admin', 'system', '["read", "update"]');

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('platform_commission_rate', '0.05', 'Platform commission rate (5%)'),
('max_file_size_mb', '50', 'Maximum book file size in MB'),
('allowed_file_types', '["pdf", "epub", "mobi"]', 'Allowed book file types'),
('auto_approve_books', 'false', 'Auto approve books without admin review'),
('registration_enabled', 'true', 'Allow new user registrations');

-- Create default admin user (password: admin123)
INSERT INTO users (email, password_hash, first_name, last_name, role, status, approved_at) VALUES
('admin@ebookdz.dz', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Ih9YQRm2kMlkEa.Im', 'Admin', 'User', 'admin', 'approved', NOW());