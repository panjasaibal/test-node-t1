const { DataSource } = require("typeorm");
const { loadAppConfig } = require("./config/appConfig");
require("dotenv").config();



async function initDataSource() {

    const appConfig = await loadAppConfig();
    const AppDataSource = new DataSource({
    type: "mssql",
    host: process.env.DB_HOST,
    port: 1433,
    username: appConfig.DB_USERNAME,
    password: appConfig.DB_PASSWORD,  
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

  return AppDataSource;
}


module.exports = { initDataSource };