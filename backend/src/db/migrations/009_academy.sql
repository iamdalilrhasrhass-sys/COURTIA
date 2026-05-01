-- COURTIA Academy — Migration 009
-- Tables : progression, skill cards, cours, parrainage

-- ═══════════════════ 1. USER PROGRESS ═══════════════════
CREATE TABLE IF NOT EXISTS user_progress (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    level           INTEGER NOT NULL DEFAULT 1,
    xp              INTEGER NOT NULL DEFAULT 0,
    current_streak  INTEGER NOT NULL DEFAULT 0,
    longest_streak  INTEGER NOT NULL DEFAULT 0,
    last_activity_at TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ═══════════════════ 2. SKILL CARDS (catalogue) ═══════════════════
CREATE TABLE IF NOT EXISTS skill_cards (
    id              SERIAL PRIMARY KEY,
    slug            VARCHAR(100) NOT NULL UNIQUE,
    title           VARCHAR(200) NOT NULL,
    description     TEXT NOT NULL,
    rarity          VARCHAR(20) NOT NULL CHECK (rarity IN ('bronze','silver','gold','diamond','epic','legendary')),
    category        VARCHAR(50) NOT NULL,
    xp_reward       INTEGER NOT NULL DEFAULT 0,
    unlock_condition_type  VARCHAR(50),
    unlock_condition_value INTEGER,
    icon            VARCHAR(50) DEFAULT 'star',
    is_published    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ═══════════════════ 3. USER SKILL CARDS (déblocages) ═══════════════════
CREATE TABLE IF NOT EXISTS user_skill_cards (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_card_id   INTEGER NOT NULL REFERENCES skill_cards(id) ON DELETE CASCADE,
    unlocked_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    shared_at       TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, skill_card_id)
);

-- ═══════════════════ 4. ACADEMY COURSES ═══════════════════
CREATE TABLE IF NOT EXISTS academy_courses (
    id              SERIAL PRIMARY KEY,
    slug            VARCHAR(100) NOT NULL UNIQUE,
    title           VARCHAR(200) NOT NULL,
    category        VARCHAR(50) NOT NULL,
    difficulty      VARCHAR(20) NOT NULL DEFAULT 'débutant',
    duration_minutes INTEGER NOT NULL DEFAULT 5,
    xp_reward       INTEGER NOT NULL DEFAULT 0,
    content         TEXT NOT NULL,
    key_points      TEXT[] DEFAULT '{}',
    quiz_json       JSONB DEFAULT '[]',
    skill_card_id   INTEGER REFERENCES skill_cards(id) ON DELETE SET NULL,
    is_published    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ═══════════════════ 5. USER COURSE PROGRESS ═══════════════════
CREATE TABLE IF NOT EXISTS user_course_progress (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id       INTEGER NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
    status          VARCHAR(20) NOT NULL DEFAULT 'en_cours' CHECK (status IN ('en_cours','termine','evalue')),
    score           INTEGER DEFAULT 0,
    completed_at    TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

-- ═══════════════════ 6. REFERRALS ═══════════════════
CREATE TABLE IF NOT EXISTS referrals (
    id              SERIAL PRIMARY KEY,
    referrer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_email  VARCHAR(255),
    referred_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    referral_code   VARCHAR(20) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'envoye' CHECK (status IN ('envoye','inscrit','converti','expire')),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    converted_at    TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skill_cards_user ON user_skill_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_course_progress_user ON user_course_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_skill_cards_rarity ON skill_cards(rarity);
CREATE INDEX IF NOT EXISTS idx_academy_courses_category ON academy_courses(category);
