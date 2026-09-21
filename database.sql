-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    telegram_id BIGINT PRIMARY KEY,
    username TEXT,
    first_name TEXT,
    role TEXT DEFAULT 'worker' CHECK (role IN ('worker', 'client')),
    worker_balance NUMERIC(10,2) DEFAULT 0.00,
    client_balance NUMERIC(10,2) DEFAULT 0.00,
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,
    referred_by BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id BIGINT REFERENCES users(telegram_id),
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    raw_files_url TEXT,
    budget NUMERIC(10,2) NOT NULL, -- Total amount paid by client
    worker_payout NUMERIC(10,2) NOT NULL, -- Budget - 10% platform fee
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'submitted', 'completed', 'disputed', 'reposted')),
    assigned_worker_id BIGINT REFERENCES users(telegram_id),
    deadline_hours INT DEFAULT 24,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Submissions Table
CREATE TABLE IF NOT EXISTS task_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    worker_id BIGINT REFERENCES users(telegram_id),
    submission_files_url TEXT NOT NULL,
    notes TEXT,
    complaint_notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'complained', 'rejected')),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Deposits Table
CREATE TABLE IF NOT EXISTS deposits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id BIGINT REFERENCES users(telegram_id),
    amount NUMERIC(10,2) NOT NULL,
    screenshot_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Withdrawals Table
CREATE TABLE IF NOT EXISTS withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id BIGINT REFERENCES users(telegram_id),
    amount NUMERIC(10,2) NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    full_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
