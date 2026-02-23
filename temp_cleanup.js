const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    try {
        // Revert the status column to smallint in producao
        await client.query(`
      ALTER TABLE producao ALTER COLUMN status DROP DEFAULT;
      ALTER TABLE producao ALTER COLUMN status TYPE smallint USING CASE WHEN status = 'PENDENTE' THEN 1 ELSE 2 END;
      ALTER TABLE producao ALTER COLUMN status SET DEFAULT 1;
    `);
        console.log('Reverted producao status to smallint.');
    } catch (e) {
        console.log('Error reverting producao status:', e.message);
    }

    await client.end();
}

run();
