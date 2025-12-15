const {initDataSource} = require('../data-source');

let appDataSource;
async function  testConnectionToAzureDb(){
    const __testAppDataSource = await initDataSource();
    console.log("Testing Azure Db Connection!!");
    __testAppDataSource.initialize()
                .then(()=> console.log("AzureDb connection tested sucessfully ✅✅"))
                .catch((e)=>{console.error("Error by conneting to db ❌❌", e)
                    __testAppDataSource.destroy()
                });
               
}

async function  createConnectionToAzureDb(){
    appDataSource = await initDataSource();
    if(appDataSource === null){
        appDataSource.initialize()
                .then(()=> console.log("Azure db connected"))
                .catch((e)=>{console.error("Error by conneting to db", e)
                    appDataSource.destroy();
                });
    }

    return appDataSource;
    
}

function closeConnectionToAzureDB(appDataSource){
    if(appDataSource.isInitialized){
        appDataSource.destroy();
        appDataSource = null;
    }
}


async function createConnectionToAzureCosmosDB(){
    appDataSource = await initDataSource();
    appDataSource.initialize()
                .then(()=> console.log("Azure db connected"))
                .catch((e)=>{console.error("Error by conneting to db", e)
                    AppDataSource.destroy();
                });
    
}

function closeConnectionToAzureCosmosDB(){
    
}


module.exports = {testConnectionToAzureDb,createConnectionToAzureDb, closeConnectionToAzureDB};
