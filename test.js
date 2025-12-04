const sql = require("mssql");

sql.connect({
  user: "saibal@app-db101",
  password: "password123@",
  database: "app-db",
  server: "app-db101.database.windows.net",
  port: 1433,
  options: {
    encrypt: true
  }
}).then(() => {
  console.log("Connected!");
}).catch(err => console.log(err));