const sql = require('mssql');

const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

const config = {
  server:   process.env.FABRIC_SERVER,
  database: process.env.FABRIC_DATABASE,
  port:     1433,
  authentication: {
    type: 'azure-active-directory-service-principal-secret',
    options: {
      clientId:     process.env.FABRIC_CLIENT_ID,
      clientSecret: process.env.FABRIC_CLIENT_SECRET,
      tenantId:     process.env.FABRIC_TENANT_ID,
    },
  },
  options: {
    encrypt:                true,
    trustServerCertificate: false,
    enableArithAbort:       true,
  },
};

let _pool = null;

async function getPool() {
  if (_pool) return _pool;
  _pool = await sql.connect(config);
  return _pool;
}

// Fabric Data Warehouse: no PRIMARY KEY, IDENTITY, UNIQUE, or DEFAULT constraints
async function connectFabric() {
  const pool = await getPool();

  // Migrate ft_financial_data: if month column missing, drop and recreate with daily-snapshot schema
  const colCheck = await pool.request().query(`
    SELECT COUNT(*) AS cnt FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.ft_financial_data') AND name = 'month'
  `);
  if (colCheck.recordset[0].cnt === 0) {
    await pool.request().query(`
      IF OBJECT_ID('dbo.ft_financial_data','U') IS NOT NULL
        DROP TABLE dbo.ft_financial_data
    `);
  }

  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ft_financial_data')
    CREATE TABLE dbo.ft_financial_data (
      entity     VARCHAR(100),
      year       INT,
      month      INT,
      day        INT,
      tab_type   VARCHAR(30),
      jan  FLOAT, feb  FLOAT, mar  FLOAT, apr  FLOAT,
      may  FLOAT, jun  FLOAT, jul  FLOAT, aug  FLOAT,
      sep  FLOAT, oct  FLOAT, nov  FLOAT, dec  FLOAT,
      updated_at DATETIME2(6),
      updated_by VARCHAR(100)
    );
  `);
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ft_audit_log')
    CREATE TABLE dbo.ft_audit_log (
      entity     VARCHAR(100),
      year       INT,
      tab_type   VARCHAR(30),
      month      VARCHAR(3),
      old_value  FLOAT,
      new_value  FLOAT,
      changed_by VARCHAR(100),
      changed_at DATETIME2(6)
    );
  `);

  // Add role column to users if missing, default existing rows
  const roleCheck = await pool.request().query(`
    SELECT COUNT(*) AS cnt FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.users') AND name = 'role'
  `);
  if (roleCheck.recordset[0].cnt === 0) {
    await pool.request().query(`ALTER TABLE dbo.users ADD role VARCHAR(50)`);
    await pool.request().query(`UPDATE dbo.users SET role = 'entity_user'`);
    await pool.request().query(`UPDATE dbo.users SET role = 'admin' WHERE username = 'admin'`);
  }

  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ft_user_entities')
    CREATE TABLE dbo.ft_user_entities (
      user_id INT,
      entity  VARCHAR(100)
    );
  `);

  console.log('✓ Fabric Warehouse connected: ProjectRequestDB');
}

async function getUserByUsername(username) {
  const pool = await getPool();
  const r = pool.request();
  r.input('username', sql.VarChar(100), username);
  const result = await r.query(`
    SELECT u.user_id, u.username, u.password_hash, u.role,
           e.entity
    FROM dbo.users u
    LEFT JOIN dbo.ft_user_entities e ON e.user_id = u.user_id
    WHERE u.username = @username
  `);
  if (result.recordset.length === 0) return null;
  const first = result.recordset[0];
  return {
    id: first.user_id,
    username: first.username,
    password_hash: first.password_hash,
    role: first.role || 'entity_user',
    entities: result.recordset.filter(r => r.entity).map(r => r.entity),
  };
}

async function getAllUsersWithEntities() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT u.user_id, u.username, u.role, u.created_at, e.entity
    FROM dbo.users u
    LEFT JOIN dbo.ft_user_entities e ON e.user_id = u.user_id
    ORDER BY u.username, e.entity
  `);
  const map = new Map();
  for (const row of result.recordset) {
    if (!map.has(row.user_id)) {
      map.set(row.user_id, { id: row.user_id, username: row.username, role: row.role || 'entity_user', created_at: row.created_at, entities: [] });
    }
    if (row.entity) map.get(row.user_id).entities.push(row.entity);
  }
  return [...map.values()].sort((a, b) => (b.role === 'admin' ? 1 : -1) || a.username.localeCompare(b.username));
}

async function createUser({ username, password_hash, role }) {
  const pool = await getPool();
  const r = pool.request();
  r.input('username',      sql.VarChar(100), username);
  r.input('password_hash', sql.VarChar(255), password_hash);
  r.input('role',          sql.VarChar(50),  role || 'entity_user');
  r.input('created_at',    sql.DateTime2,    new Date());
  // Fabric has no IDENTITY — use MAX(user_id)+1
  const idRes = await pool.request().query(`SELECT ISNULL(MAX(user_id), 0) + 1 AS new_id FROM dbo.users`);
  const newId = idRes.recordset[0].new_id;
  r.input('user_id', sql.Int, newId);
  await r.query(`
    INSERT INTO dbo.users (user_id, username, password_hash, role, created_at)
    VALUES (@user_id, @username, @password_hash, @role, @created_at)
  `);
  return newId;
}

async function updateUser(userId, { username, password_hash, role }) {
  const pool = await getPool();
  const r = pool.request();
  r.input('user_id',  sql.Int,          userId);
  r.input('username', sql.VarChar(100), username);
  r.input('role',     sql.VarChar(50),  role || 'entity_user');
  if (password_hash) {
    r.input('password_hash', sql.VarChar(255), password_hash);
    await r.query(`UPDATE dbo.users SET username=@username, password_hash=@password_hash, role=@role WHERE user_id=@user_id`);
  } else {
    await r.query(`UPDATE dbo.users SET username=@username, role=@role WHERE user_id=@user_id`);
  }
}

async function deleteUser(userId) {
  const pool = await getPool();
  const r1 = pool.request();
  r1.input('user_id', sql.Int, userId);
  await r1.query(`DELETE FROM dbo.ft_user_entities WHERE user_id = @user_id`);
  const r2 = pool.request();
  r2.input('user_id', sql.Int, userId);
  await r2.query(`DELETE FROM dbo.users WHERE user_id = @user_id`);
}

async function setUserEntities(userId, entities) {
  const pool = await getPool();
  const r = pool.request();
  r.input('user_id', sql.Int, userId);
  await r.query(`DELETE FROM dbo.ft_user_entities WHERE user_id = @user_id`);
  for (const entity of (entities || [])) {
    const ri = pool.request();
    ri.input('user_id', sql.Int,          userId);
    ri.input('entity',  sql.VarChar(100), entity);
    await ri.query(`INSERT INTO dbo.ft_user_entities (user_id, entity) VALUES (@user_id, @entity)`);
  }
}

async function queryAllEntities() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT DISTINCT entity, tab_type FROM dbo.ft_financial_data ORDER BY entity, tab_type
  `);
  return result.recordset;
}

async function queryFinancialData({ year, month, day, entities }) {
  const pool = await getPool();
  const r = pool.request();
  r.input('year',  sql.Int, year);
  r.input('month', sql.Int, month);
  r.input('day',   sql.Int, day);

  if (entities && entities.length > 0) {
    // Filter to specific entities (entity user view)
    const placeholders = entities.map((_, i) => `@e${i}`).join(', ');
    entities.forEach((e, i) => r.input(`e${i}`, sql.VarChar(100), e));
    const result = await r.query(`
      SELECT entity, year, month, day, tab_type,
             jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec,
             updated_at, updated_by
      FROM dbo.ft_financial_data
      WHERE year = @year AND month = @month AND day = @day
        AND entity IN (${placeholders})
      ORDER BY entity, tab_type
    `);
    return result.recordset;
  } else {
    // All entities (admin view)
    const result = await r.query(`
      SELECT entity, year, month, day, tab_type,
             jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec,
             updated_at, updated_by
      FROM dbo.ft_financial_data
      WHERE year = @year AND month = @month AND day = @day
      ORDER BY entity, tab_type
    `);
    return result.recordset;
  }
}

async function queryCurrentRow({ entity, year, month, day, tab_type }) {
  const pool = await getPool();
  const r = pool.request();
  r.input('entity',   sql.VarChar(100), entity);
  r.input('year',     sql.Int,          year);
  r.input('month',    sql.Int,          month);
  r.input('day',      sql.Int,          day);
  r.input('tab_type', sql.VarChar(30),  tab_type);
  const result = await r.query(`
    SELECT TOP 1 jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec
    FROM dbo.ft_financial_data
    WHERE entity = @entity AND year = @year AND month = @month
      AND day = @day AND tab_type = @tab_type
  `);
  return result.recordset[0] || null;
}

async function queryAuditLog({ entity, tab_type, year, limit = 500 }) {
  const pool = await getPool();
  const r = pool.request();
  r.input('lim', sql.Int, Number(limit));
  let where = 'WHERE 1=1';
  if (entity)   { r.input('entity',   sql.VarChar(100), entity);   where += ' AND entity = @entity'; }
  if (tab_type) { r.input('tab_type', sql.VarChar(30),  tab_type); where += ' AND tab_type = @tab_type'; }
  if (year)     { r.input('year',     sql.Int,          Number(year)); where += ' AND year = @year'; }
  const result = await r.query(`
    SELECT TOP (@lim) entity, year, tab_type, month, old_value, new_value, changed_by, changed_at
    FROM dbo.ft_audit_log
    ${where}
    ORDER BY changed_at DESC
  `);
  return result.recordset;
}

async function mergeFinancialData({ entity, year, month, day, tab_type, months, updated_by }) {
  const monthSrcCols = MONTHS.map(m => `@${m} AS ${m}`).join(', ');
  const monthUpdSet  = MONTHS.map(m => `tgt.${m} = src.${m}`).join(', ');
  const monthInsCols = MONTHS.join(', ');
  const monthInsSrc  = MONTHS.map(m => `src.${m}`).join(', ');
  const mergeSql = `
    MERGE dbo.ft_financial_data AS tgt
    USING (SELECT @entity AS entity, @year AS year, @month AS month, @day AS day,
                  @tab_type AS tab_type, ${monthSrcCols},
                  @updated_at AS updated_at, @updated_by AS updated_by) AS src
      ON  tgt.entity   = src.entity
      AND tgt.year     = src.year
      AND tgt.month    = src.month
      AND tgt.day      = src.day
      AND tgt.tab_type = src.tab_type
    WHEN MATCHED THEN
      UPDATE SET ${monthUpdSet}, tgt.updated_at = src.updated_at, tgt.updated_by = src.updated_by
    WHEN NOT MATCHED THEN
      INSERT (entity, year, month, day, tab_type, ${monthInsCols}, updated_at, updated_by)
      VALUES (src.entity, src.year, src.month, src.day, src.tab_type,
              ${monthInsSrc}, src.updated_at, src.updated_by);
  `;
  // Fabric snapshot isolation can produce transient update conflicts — retry up to 3 times
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const pool = await getPool();
      const r = pool.request();
      r.input('entity',     sql.VarChar(100), entity);
      r.input('year',       sql.Int,          year);
      r.input('month',      sql.Int,          month);
      r.input('day',        sql.Int,          day);
      r.input('tab_type',   sql.VarChar(30),  tab_type);
      r.input('updated_by', sql.VarChar(100), updated_by);
      r.input('updated_at', sql.DateTime2,    new Date());
      for (const m of MONTHS) r.input(m, sql.Float, months[m] ?? null);
      await r.query(mergeSql);
      return;
    } catch (err) {
      if (attempt < 3 && err.message && err.message.includes('update conflict')) {
        await new Promise(resolve => setTimeout(resolve, 150 * attempt));
        continue;
      }
      throw err;
    }
  }
}

async function writeAuditLog(entries) {
  if (!entries || entries.length === 0) return;
  const pool = await getPool();
  const now  = new Date();
  // Fabric Warehouse does not support the TDS bulk-load protocol — use individual INSERTs
  for (const e of entries) {
    const r = pool.request();
    r.input('entity',     sql.VarChar(100), e.entity);
    r.input('year',       sql.Int,          e.year);
    r.input('tab_type',   sql.VarChar(30),  e.tab_type);
    r.input('month',      sql.VarChar(3),   e.month);
    r.input('old_value',  sql.Float,        e.old_value);
    r.input('new_value',  sql.Float,        e.new_value);
    r.input('changed_by', sql.VarChar(100), e.changed_by);
    r.input('changed_at', sql.DateTime2,    now);
    await r.query(`
      INSERT INTO dbo.ft_audit_log
        (entity, year, tab_type, month, old_value, new_value, changed_by, changed_at)
      VALUES
        (@entity, @year, @tab_type, @month, @old_value, @new_value, @changed_by, @changed_at)
    `);
  }
}

module.exports = {
  connectFabric,
  getUserByUsername, getAllUsersWithEntities, createUser, updateUser, deleteUser, setUserEntities,
  queryAllEntities, queryFinancialData, queryCurrentRow, queryAuditLog,
  mergeFinancialData, writeAuditLog,
  getPool,
};
