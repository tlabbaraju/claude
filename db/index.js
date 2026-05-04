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

let conn;
let connPromise;

function getConnection() {
  if (conn) return Promise.resolve(conn);
  if (connPromise) return connPromise;

  connPromise = new Promise((resolve, reject) => {
    sql.open(buildConnectionString(), (err, connection) => {
      connPromise = null;
      if (err) {
        reject(err);
      } else {
        conn = connection;
        resolve(conn);
      }
    });
  });

  return connPromise;
}

async function query(sqlText, params = []) {
  const connection = await getConnection();
  return new Promise((resolve, reject) => {
    connection.query(sqlText, params, (err, rows) => {
      if (err) {
        conn = null; // reset so next call re-opens
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

async function queryOne(sqlText, params = []) {
  const rows = await query(sqlText, params);
  return rows.length ? rows[0] : null;
}

module.exports = { query, queryOne };
