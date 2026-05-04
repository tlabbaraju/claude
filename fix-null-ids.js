require('dotenv').config();
const { query } = require('./db');

(async () => {
  try {
    const nullRows = await query(
      'SELECT project_name, request_date, requestor, description, it_comments FROM dbo.project_requests WHERE project_id IS NULL'
    );
    console.log(`Found ${nullRows.length} rows with NULL project_id`);
    if (!nullRows.length) { process.exit(0); }

    const maxRows = await query('SELECT ISNULL(MAX(project_id), 0) AS max_id FROM dbo.project_requests WHERE project_id IS NOT NULL');
    let nextId = (maxRows[0]?.max_id ?? 0) + 1;

    for (const row of nullRows) {
      await query(
        `UPDATE dbo.project_requests SET project_id = ? WHERE project_id IS NULL AND project_name = ? AND requestor = ?`,
        [String(nextId), row.project_name, row.requestor]
      );
      console.log(`Assigned project_id=${nextId} to "${row.project_name}" by ${row.requestor}`);
      nextId++;
    }
    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
