import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

async function test() {
  const db = await open({
    filename: path.join(process.cwd(), 'database.sqlite'),
    driver: sqlite3.Database
  });
  const res = await db.all("SELECT DISTINCT collection FROM records");
  console.log("Collections:", res);
}
test();
