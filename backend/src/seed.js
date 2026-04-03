const pool = require('./db');

async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database...');
    
    // Check if users table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ Database already initialized');
      return true;
    }
    
    console.log('📝 Creating database schema...');
    
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(50) DEFAULT 'broker',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ users table created');
    
    // Create clients table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        email VARCHAR(255),
        phone VARCHAR(20),
        company_name VARCHAR(255),
        type VARCHAR(50),
        status VARCHAR(50) DEFAULT 'prospect',
        loyalty_score INT DEFAULT 0,
        risk_score INT DEFAULT 50,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ clients table created');
    
    // Create contracts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contracts (
        id SERIAL PRIMARY KEY,
        client_id INT REFERENCES clients(id),
        type VARCHAR(100),
        number VARCHAR(100),
        annual_premium DECIMAL(10,2),
        status VARCHAR(50),
        company VARCHAR(100),
        start_date DATE,
        end_date DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ contracts table created');
    
    // Create prospects table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS prospects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        company VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(20),
        stage VARCHAR(50) DEFAULT 'nouveau',
        source VARCHAR(50),
        value DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ prospects table created');
    
    // Create appointments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id),
        client_id INT REFERENCES clients(id),
        organizer_id INT REFERENCES users(id),
        title VARCHAR(255),
        description TEXT,
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        timezone VARCHAR(100),
        status VARCHAR(50) DEFAULT 'planifié',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ appointments table created');
    
    // Create ark_conversations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ark_conversations (
        id SERIAL PRIMARY KEY,
        client_id INT REFERENCES clients(id),
        user_id INT REFERENCES users(id),
        user_message TEXT,
        ark_response TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ ark_conversations table created');

    // Create broker_profiles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS broker_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        cabinet VARCHAR(255),
        orias VARCHAR(50),
        telephone VARCHAR(20),
        adresse TEXT,
        ville VARCHAR(100),
        code_postal VARCHAR(10),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ broker_profiles table created');
    
    console.log('✅ Database initialized successfully');
    return true;
  } catch (err) {
    console.error('❌ Database initialization error:', err.message);
    return false;
  }
}

module.exports = { initializeDatabase };
