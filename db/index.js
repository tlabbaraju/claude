const sql = require('msnodesqlv8');

function buildConnectionString() {
  return (
    `Driver={ODBC Driver 18 for SQL Server};` +
    `Server=tcp:${process.env.FABRIC_SERVER},1433;` +
    `Database=${process.env.FABRIC_DATABASE};` +
    `Authentication=ActiveDirectoryServicePrincipal;` +
    `UID=${process.env.FABRIC_CLIENT_ID};` +
    `PWD=${process.env.FABRIC_CLIENT_SECRET};` +
    `Encrypt=yes;` +
    `TrustServerCertificate=no;` +
    `Connection Timeout=30`
  );
}

let pool;

function getPool() {
  if (!pool) {
    pool = new sql.Pool({
      connectionString: buildConnectionString(),
      ceiling: 4,
      heartbeatSecs: 20
    });
    pool.open();
  }
  return pool;
}

function query(sqlText, params = []) {
  return new Promise((resolve, reject) => {
    getPool().query(sqlText, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

async function queryOne(sqlText, params = []) {
  const rows = await query(sqlText, params);
  return rows.length ? rows[0] : null;
}

module.exports = { query, queryOne };
