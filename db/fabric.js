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
    encrypt:                  true,
    trustServerCertificate:   false,
    enableArithAbort:         true,
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
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ft_financial_data')
    CREATE TABLE dbo.ft_financial_data (
      entity     VARCHAR(100),
      year       INT,
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
  console.log('✓ Fabric Warehouse connected: ProjectRequestDB');
}

async function mergeFinancialData({ entity, year, tab_type, months, updated_by }) {
  const pool = await getPool();
  const r = pool.request();
  r.input('entity',     sql.VarChar(100), entity);
  r.input('year',       sql.Int,          year);
  r.input('tab_type',   sql.VarChar(30),  tab_type);
  r.input('updated_by', sql.VarChar(100), updated_by);
  r.input('updated_at', sql.DateTime2,    new Date());
  for (const m of MONTHS) {
    r.input(m, sql.Float, months[m] ?? null);
  }
  const monthSrcCols = MONTHS.map(m => `@${m} AS ${m}`).join(', ');
  const monthUpdSet  = MONTHS.map(m => `tgt.${m} = src.${m}`).join(', ');
  const monthInsCols = MONTHS.join(', ');
  const monthInsSrc  = MONTHS.map(m => `src.${m}`).join(', ');
  await r.query(`
    MERGE dbo.ft_financial_data AS tgt
    USING (SELECT @entity AS entity, @year AS year, @tab_type AS tab_type,
                  ${monthSrcCols},
                  @updated_at AS updated_at, @updated_by AS updated_by) AS src
      ON tgt.entity = src.entity AND tgt.year = src.year AND tgt.tab_type = src.tab_type
    WHEN MATCHED THEN
      UPDATE SET ${monthUpdSet}, tgt.updated_at = src.updated_at, tgt.updated_by = src.updated_by
    WHEN NOT MATCHED THEN
      INSERT (entity, year, tab_type, ${monthInsCols}, updated_at, updated_by)
      VALUES (src.entity, src.year, src.tab_type, ${monthInsSrc}, src.updated_at, src.updated_by);
  `);
}

async function writeAuditLog(entries) {
  if (!entries || entries.length === 0) return;
  const pool = await getPool();
  const table = new sql.Table('dbo.ft_audit_log');
  table.create = false;
  table.columns.add('entity',     sql.VarChar(100), { nullable: false });
  table.columns.add('year',       sql.Int,           { nullable: false });
  table.columns.add('tab_type',   sql.VarChar(30),  { nullable: false });
  table.columns.add('month',      sql.VarChar(3),   { nullable: false });
  table.columns.add('old_value',  sql.Float,         { nullable: true });
  table.columns.add('new_value',  sql.Float,         { nullable: true });
  table.columns.add('changed_by', sql.VarChar(100), { nullable: false });
  table.columns.add('changed_at', sql.DateTime2,    { nullable: false });
  const now = new Date();
  for (const e of entries) {
    table.rows.add(e.entity, e.year, e.tab_type, e.month, e.old_value, e.new_value, e.changed_by, now);
  }
  await pool.request().bulk(table);
}

module.exports = { connectFabric, mergeFinancialData, writeAuditLog, getPool };
