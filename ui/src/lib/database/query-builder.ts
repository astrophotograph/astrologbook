import { DatabaseConnection } from './types';

export class QueryBuilder {
  private db: DatabaseConnection;
  private tableName: string;
  private selectFields: string[] = ['*'];
  private whereConditions: Array<{ field: string; operator: string; value: any }> = [];
  private orderBy: Array<{ field: string; direction: 'ASC' | 'DESC' }> = [];
  private limitValue?: number;
  private offsetValue?: number;

  constructor(db: DatabaseConnection, tableName: string) {
    this.db = db;
    this.tableName = tableName;
  }

  select(fields: string | string[]): this {
    this.selectFields = Array.isArray(fields) ? fields : [fields];
    return this;
  }

  where(field: string, operator: string, value: any): this {
    this.whereConditions.push({ field, operator, value });
    return this;
  }

  whereEquals(field: string, value: any): this {
    return this.where(field, '=', value);
  }

  whereIn(field: string, values: any[]): this {
    const placeholders = values.map(() => '?').join(', ');
    this.whereConditions.push({
      field,
      operator: `IN (${placeholders})`,
      value: values
    });
    return this;
  }

  orderByAsc(field: string): this {
    this.orderBy.push({ field, direction: 'ASC' });
    return this;
  }

  orderByDesc(field: string): this {
    this.orderBy.push({ field, direction: 'DESC' });
    return this;
  }

  limit(count: number): this {
    this.limitValue = count;
    return this;
  }

  offset(count: number): this {
    this.offsetValue = count;
    return this;
  }

  async find<T = any>(): Promise<T[]> {
    const { sql, params } = this.buildSelectQuery();
    return await this.db.query<T>(sql, params);
  }

  async findOne<T = any>(): Promise<T | null> {
    this.limit(1);
    const results = await this.find<T>();
    return results.length > 0 ? results[0] : null;
  }

  async count(): Promise<number> {
    const originalFields = this.selectFields;
    this.selectFields = ['COUNT(*) as count'];

    const { sql, params } = this.buildSelectQuery();
    const result = await this.db.query<{ count: number }>(sql, params);

    this.selectFields = originalFields;
    return result[0]?.count || 0;
  }

  private buildSelectQuery(): { sql: string; params: any[] } {
    let sql = `SELECT ${this.selectFields.join(', ')} FROM ${this.tableName}`;
    const params: any[] = [];

    if (this.whereConditions.length > 0) {
      const whereClause = this.whereConditions.map(condition => {
        if (condition.operator.includes('IN')) {
          params.push(...(Array.isArray(condition.value) ? condition.value : [condition.value]));
          return `${condition.field} ${condition.operator}`;
        } else {
          params.push(condition.value);
          return `${condition.field} ${condition.operator} ?`;
        }
      }).join(' AND ');

      sql += ` WHERE ${whereClause}`;
    }

    if (this.orderBy.length > 0) {
      const orderClause = this.orderBy
        .map(order => `${order.field} ${order.direction}`)
        .join(', ');
      sql += ` ORDER BY ${orderClause}`;
    }

    if (this.limitValue !== undefined) {
      sql += ` LIMIT ${this.limitValue}`;
    }

    if (this.offsetValue !== undefined) {
      sql += ` OFFSET ${this.offsetValue}`;
    }

    return { sql, params };
  }

  // Insert operations
  async insert(data: Record<string, any>): Promise<{ lastInsertRowid: number | bigint; changes: number }> {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = fields.map(() => '?').join(', ');

    const sql = `INSERT INTO ${this.tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
    return await this.db.execute(sql, values);
  }

  // Update operations
  async update(data: Record<string, any>): Promise<{ changes: number }> {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields.map(field => `${field} = ?`).join(', ');

    let sql = `UPDATE ${this.tableName} SET ${setClause}`;
    const params = [...values];

    if (this.whereConditions.length > 0) {
      const whereClause = this.whereConditions.map(condition => {
        params.push(condition.value);
        return `${condition.field} ${condition.operator} ?`;
      }).join(' AND ');

      sql += ` WHERE ${whereClause}`;
    }

    const result = await this.db.execute(sql, params);
    return { changes: result.changes };
  }

  // Delete operations
  async delete(): Promise<{ changes: number }> {
    let sql = `DELETE FROM ${this.tableName}`;
    const params: any[] = [];

    if (this.whereConditions.length > 0) {
      const whereClause = this.whereConditions.map(condition => {
        params.push(condition.value);
        return `${condition.field} ${condition.operator} ?`;
      }).join(' AND ');

      sql += ` WHERE ${whereClause}`;
    }

    const result = await this.db.execute(sql, params);
    return { changes: result.changes };
  }
}

// Factory function to create query builders
export const createQueryBuilder = (db: DatabaseConnection, tableName: string): QueryBuilder => {
  return new QueryBuilder(db, tableName);
};
