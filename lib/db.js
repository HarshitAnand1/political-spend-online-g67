import { Pool } from 'pg';

let pool;

export function getPool() {
  if (!pool) {
    const isProduction = process.env.NODE_ENV === 'production';
    const isServerless = process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL;
    
    console.log('Initializing database pool...');
    
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // EC2-optimized connection pool settings (persistent server)
      max: isServerless ? 2 : 10, // 10 connections for EC2
      min: isServerless ? 0 : 2, // Keep 2 connections ready on EC2
      idleTimeoutMillis: 30000, // 30s for EC2
      connectionTimeoutMillis: 5000, // Fail fast on connection issues
      // Connection health and stability
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      allowExitOnIdle: isServerless, // Only exit on idle in serverless
      // Add statement timeout to prevent hanging queries
      statement_timeout: 30000, // 30 second query timeout
    });

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client:', err.message);
    });

    // Simplified logging for production
    if (!isProduction) {
      pool.on('connect', () => {
        console.log('New database connection established');
      });

      pool.on('remove', () => {
        console.log('Database connection removed from pool');
      });
    }
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
    
    // Safe logging for serverless environments - only log primitives
    const queryPreview = text.substring(0, 100).replace(/\s+/g, ' ');
    console.log(`Query executed: ${queryPreview}... | Duration: ${duration}ms | Rows: ${res.rowCount}`);
    
    return res;
  } catch (error) {
    console.error('Database query error:', error.message);
    throw error;
  }
}

// Helper function to get a single client (for transactions)
export async function getClient() {
  const pool = getPool();
  return await pool.connect();
}

// Graceful shutdown for serverless environments
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Database pool closed');
  }
}

// Export for cleanup in API routes if needed
export { pool };
