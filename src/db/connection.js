const {AppDataSource} = require('../data-source');


function createConnectionToAzureDb(){
    AppDataSource.initialize()
                .then(()=> console.log("Azure db connected"))
                .catch((e)=>console.error("Error by conneting to db", e));
}


module.exports = {createConnectionToAzureDb};
