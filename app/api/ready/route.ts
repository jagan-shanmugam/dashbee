import { createTestAdapter } from '@/lib/db-adapters';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Readiness probe endpoint for Kubernetes and orchestration platforms.
 *
 * This endpoint checks if the application is ready to serve traffic:
 * - Database connectivity (if configured)
 * - Critical services availability
 *
 * Returns:
 * - 200 if ready to serve traffic
 * - 503 if not ready (will be removed from load balancer)
 */
export async function GET() {
  const checks = {
    database: false,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || 'unknown'
  };

  try {
    // Check if database is configured and accessible
    if (process.env.DATABASE_URL || process.env.SQLITE_PATH) {
      let adapter;
      if (process.env.SQLITE_PATH) {
        adapter = createTestAdapter({
          type: 'sqlite', host: '', port: 0, database: '', user: '', password: '', ssl: false,
          filename: process.env.SQLITE_PATH,
        });
      } else {
        const url = new URL(process.env.DATABASE_URL!);
        const dbType = url.protocol.startsWith('postgresql') ? 'postgresql' as const : 'mysql' as const;
        adapter = createTestAdapter({
          type: dbType,
          host: url.hostname,
          port: parseInt(url.port) || (dbType === 'postgresql' ? 5432 : 3306),
          database: url.pathname.slice(1),
          user: url.username,
          password: url.password,
          ssl: url.searchParams.get('ssl') === 'true' || process.env.DATABASE_SSL === 'true',
        });
      }

      try {
        await adapter.testConnection();
        checks.database = true;
      } finally {
        await adapter.close();
      }
    } else {
      // No database configured - still ready (using demo database)
      checks.database = true;
    }

    return Response.json({
      status: 'ready',
      checks
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    // Not ready - database is unreachable
    return Response.json({
      status: 'not ready',
      checks,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}
