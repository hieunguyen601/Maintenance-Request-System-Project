import pg from 'pg';
import dotenv from 'dotenv'

dotenv.config();

const {Pool} = pg;

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME
})

export default pool;