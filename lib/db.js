import { Pool } from 'pg';

let pool;

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Connection pool settings
      max: 5, // Reduced from 20 to avoid too many connections
      idleTimeoutMillis: 10000, // Close idle connections faster
      connectionTimeoutMillis: 10000, // Increased from 2000ms to 10000ms
      // Add these for better SSH tunnel compatibility
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      allowExitOnIdle: true, // Allow pool to close when no queries
    });

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });

    // Log when connections are created/removed
    pool.on('connect', () => {
      console.log('New database connection established');
    });

    pool.on('remove', () => {
      console.log('Database connection removed from pool');
    });
  }
  
  return pool;
}

// Helper function to execute queries
export async function query(text, params) {
  const pool = getPool();
  const start = Date.now();
  
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Helper function to get a single client (for transactions)
export async function getClient() {
  const pool = getPool();
  return await pool.connect();
}
