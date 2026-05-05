import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

async function test() {
  const db = await open({
    filename: path.join(process.cwd(), 'database.sqlite'),
    driver: sqlite3.Database
  });
  console.log(await db.all("SELECT id, collection, typeof(id) FROM records LIMIT 10"));
}
test();
