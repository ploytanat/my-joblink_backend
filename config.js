const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '789067ploy',
  database: 'test',
  connectionLimit: 10,
});

module.exports = {
  pool,
};
