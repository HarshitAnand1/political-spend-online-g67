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
      min: isServerless ? 0 : 1, // Keep 1 connection ready on EC2
      idleTimeoutMillis: 20000, // Close idle connections after 20s (before AWS timeout)
      connectionTimeoutMillis: 10000, // 10s to establish connection
      // Connection health and stability - CRITICAL for RDS
      keepAlive: true,
      keepAliveInitialDelayMillis: 5000, // Send keepalive every 5s
      allowExitOnIdle: isServerless, // Only exit on idle in serverless
      // Query timeouts
      statement_timeout: 60000, // 60 second query timeout
      query_timeout: 60000,
      // SSL for RDS (required)
      ssl: process.env.DATABASE_URL?.includes('rds.amazonaws.com') 
        ? { rejectUnauthorized: false } 
        : false,
    });

    // Handle pool errors - auto-recover from connection issues
    pool.on('error', (err) => {
      console.error('Pool error (will auto-recover):', err.code || err.message);
      
      // On network errors, clear the pool to force reconnection
      if (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET' || err.code === 'ENOTFOUND') {
        console.log('Network error detected - clearing pool for reconnection');
        pool.end().catch(() => {});
        pool = null;
      }
    });

    // Connection lifecycle logging
    pool.on('connect', (client) => {
      console.log('Database connection established');
      
      // Set connection-level timeouts
      client.query('SET statement_timeout = 60000').catch(() => {});
    });

    pool.on('acquire', () => {
      if (!isProduction) console.log('Client acquired from pool');
    });

    pool.on('remove', () => {
      console.log('Database connection removed from pool');
    });
  }
  
  return pool;
}

// Helper function to execute queries with retry logic
export async function query(text, params, retries = 2) {
  const start = Date.now();
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const currentPool = getPool();
      const res = await currentPool.query(text, params);
      const duration = Date.now() - start;
      
      // Safe logging for serverless environments - only log primitives
      const queryPreview = text.substring(0, 100).replace(/\s+/g, ' ');
      console.log(`Query executed: ${queryPreview}... | Duration: ${duration}ms | Rows: ${res.rowCount}`);
      
      return res;
    } catch (error) {
      const isNetworkError = error.code === 'ETIMEDOUT' || 
                            error.code === 'ECONNRESET' || 
                            error.code === 'ENOTFOUND' ||
                            error.code === 'ECONNREFUSED';
      
      if (isNetworkError && attempt < retries) {
        console.log(`Network error on attempt ${attempt + 1}/${retries + 1}, retrying... (${error.code})`);
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        
        // Force pool reconnection by resetting the module-level variable
        if (pool) {
          await pool.end().catch(() => {});
          pool = null;
        }
        
        continue; // Retry
      }
      
      console.error('Database query error:', error.message, `(code: ${error.code})`);
      throw error;
    }
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
