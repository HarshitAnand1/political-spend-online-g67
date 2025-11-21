import { Pool } from 'pg';

let pool;

export function getPool() {
  if (!pool) {
    console.log('Initializing database pool with URL:', process.env.DATABASE_URL);
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Production-optimized connection pool settings
      max: 20, // Allow more concurrent connections in prod
      min: 2, // Keep minimum connections ready
      idleTimeoutMillis: 30000, // Close idle connections after 30s
      connectionTimeoutMillis: 5000, // Fail fast on connection issues
      // Connection health and stability
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      allowExitOnIdle: false, // Keep pool alive for serverless/container environments
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
