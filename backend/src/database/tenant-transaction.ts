import pg from 'pg';
import { appPool } from '../config/database.js';
import { logger } from '../utils/logger.js';

export interface TenantContext {
  organizationId: string;
  userId: string;
  role: string;
}

/**
 * Runs queries inside a transaction with PostgreSQL session variables
 * configured for Row-Level Security (RLS) enforcement.
 */
export async function withTenantTransaction<T>(
  context: TenantContext,
  operation: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await appPool.connect();
  try {
    await client.query('BEGIN');

    // Set transaction-local session variables (3rd argument = true scopes to current transaction)
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [context.userId]);
    await client.query("SELECT set_config('app.current_org_id', $1, true)", [context.organizationId]);
    await client.query("SELECT set_config('app.current_role', $1, true)", [context.role]);

    const result = await operation(client);

    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      logger.error({ rollbackErr }, 'Failed to rollback tenant transaction');
    }
    throw error;
  } finally {
    client.release();
  }
}

