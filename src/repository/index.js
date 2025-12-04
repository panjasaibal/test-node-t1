const { AppDataSource } = require('../data-source');
const User = require('../entity/User')

const usersRepository = ()=>{
    
    return AppDataSource.getRepository(User);
}

module.exports = usersRepository;