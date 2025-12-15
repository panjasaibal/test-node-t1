const { createConnectionToAzureDb } = require('../db/connection');
const User = require('../entity/User')

const usersRepository = async()=>{
    return (await createConnectionToAzureDb()).getRepository(User);
}

module.exports = usersRepository;