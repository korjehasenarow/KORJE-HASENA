const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

async function updateName() {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, 'data', 'korje_hasena.sqlite');
  const buf = fs.readFileSync(dbPath);
  const db = new SQL.Database(buf);

  db.run("UPDATE committee_members SET name_bn = 'জনাব মোঃ আল আমিন অনিক', name_en = 'MD AL AMIN ONIK' WHERE id = 9 OR name_bn LIKE '%আল আমিন অনিক%';");
  
  const res = db.exec("SELECT id, name_bn, designation_bn, mobile FROM committee_members WHERE id = 9;");
  console.log('Updated record:', res[0]?.values);

  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  console.log('✓ Successfully saved updated database to disk.');
}

updateName().catch(console.error);
