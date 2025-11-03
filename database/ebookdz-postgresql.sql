-- EBOOKDZ PostgreSQL Schema (Neon Compatible)
-- Converted from MySQL to PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User roles enum
CREATE TYPE user_role AS ENUM ('client', 'vendor', 'admin');
CREATE TYPE user_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE book_status AS ENUM ('draft', 'pending', 'approved', 'rejected');
CREATE TYPE transaction_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
CREATE TYPE book_language AS ENUM ('ar', 'fr', 'en', 'ber');

-- Categories table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role user_role NOT NULL DEFAULT 'client',
    status user_status NOT NULL DEFAULT 'pending',
    profile_image VARCHAR(255),
    approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Books table
CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    isbn VARCHAR(20),
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'DZD',
    language book_language DEFAULT 'ar',
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    cover_image VARCHAR(255),
    file_path VARCHAR(255),
    file_size BIGINT,
    download_count INTEGER DEFAULT 0,
    status book_status DEFAULT 'pending',
    approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add full-text search index for books
CREATE INDEX idx_books_search ON books USING gin(to_tsvector('english', title || ' ' || author || ' ' || COALESCE(description, '')));

-- Transactions table
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    transaction_uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    buyer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vendor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    platform_commission DECIMAL(10,2) NOT NULL DEFAULT 0,
    vendor_payout DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'DZD',
    status transaction_status DEFAULT 'pending',
    slickpay_transaction_id VARCHAR(255),
    slickpay_payment_url TEXT,
    failure_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User purchases table (successful transactions)
CREATE TABLE user_purchases (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    download_count INTEGER DEFAULT 0,
    last_downloaded_at TIMESTAMP,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, book_id)
);

-- User sessions table (JWT token tracking)
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    refresh_token_hash VARCHAR(64) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP NOT NULL,
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SlickPay configurations (encrypted API keys per user)
CREATE TABLE slickpay_configs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    api_key_encrypted TEXT NOT NULL,
    secret_key_encrypted TEXT NOT NULL,
    merchant_id VARCHAR(100),
    webhook_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_test_mode BOOLEAN DEFAULT true,
    test_status VARCHAR(20),
    last_tested_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- System settings table
CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_status ON users(role, status);
CREATE INDEX idx_books_vendor ON books(vendor_id);
CREATE INDEX idx_books_status ON books(status);
CREATE INDEX idx_books_category ON books(category_id);
CREATE INDEX idx_transactions_buyer ON transactions(buyer_id);
CREATE INDEX idx_transactions_vendor ON transactions(vendor_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_uuid ON transactions(transaction_uuid);
CREATE INDEX idx_user_purchases_user ON user_purchases(user_id);
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(token_hash);
CREATE INDEX idx_slickpay_user ON slickpay_configs(user_id);

-- Insert default categories
INSERT INTO categories (name, description) VALUES
('Literature', 'Fiction and non-fiction literature'),
('Science', 'Scientific and technical books'),
('History', 'Historical books and biographies'),
('Education', 'Educational and academic materials'),
('Technology', 'Programming and technology guides'),
('Business', 'Business and entrepreneurship'),
('Arts', 'Art, design, and creative works'),
('Religion', 'Religious and spiritual texts'),
('Health', 'Health and medical information'),
('Children', 'Books for children and young adults');

-- Insert default admin user (password: admin123)
INSERT INTO users (email, password_hash, first_name, last_name, role, status, approved_at) VALUES
('admin@ebookdz.dz', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxErVx7WyuS2DpLMkI/fHlVzF6i', 'Admin', 'EBOOKDZ', 'admin', 'approved', CURRENT_TIMESTAMP);

-- Insert system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('platform_commission_rate', '0.05', 'Platform commission rate (5%)'),
('auto_approve_books', 'false', 'Automatically approve books without admin review'),
('registration_enabled', 'true', 'Allow new user registration'),
('maintenance_mode', 'false', 'Enable maintenance mode'),
('max_book_file_size', '52428800', 'Maximum book file size in bytes (50MB)'),
('supported_book_formats', 'pdf,epub,mobi', 'Supported ebook formats'),
('supported_image_formats', 'jpeg,jpg,png,webp', 'Supported image formats for covers');

-- Add update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON books FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON user_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_slickpay_configs_updated_at BEFORE UPDATE ON slickpay_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();