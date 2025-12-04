const { DataSource } = require("typeorm");
require("dotenv").config();

const AppDataSource = new DataSource({
  type: "mssql",
  host: process.env.DB_HOST,
  port: 1433,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,  
  database: process.env.DB_NAME,
  synchronize: true, // ❗ set false in production
  logging: false,
  extra: {
    encrypt: true,
    trustServerCertificate: false
  },
  options: {
    encrypt: true
  },
  entities: [__dirname + "/entity/*.js"],
});

module.exports = { AppDataSource };