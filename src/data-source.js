const { DataSource } = require("typeorm");
require("dotenv").config();

const AppDataSource = new DataSource({
  type: "mssql",
  host: "app-db101.database.windows.net",
  port: 1433,
  username: "saibal",
  password: process.env.DB_PASSWORD,  
  database: "app-db",
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