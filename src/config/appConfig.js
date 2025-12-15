const { AppConfigurationClient } = require("@azure/app-configuration");

const CONNECTION_STRING = process.env.AZURE_APP_CONFIG_CONNECTION_STRING;
const client = new AppConfigurationClient(CONNECTION_STRING);


async function loadAppConfig() {

    const settings = {};

    const configIterator = client.listConfigurationSettings();

    for await (const setting of configIterator){
        settings[setting.key] = setting.value;
    }

    if(Object.keys(settings).length ===0) throw new Error("Azure config have 0 values 💥");

    console.log(" ✅✅ Loded Configs are :", Object.keys(settings));

    return settings;
    
}

module.exports = { loadAppConfig };