const fs = require('fs')
const FILENAME = 'data.json'

const getUsers = () => {
  const users = fs.readFileSync(FILENAME, 'utf-8')
  return JSON.parse(users)
}

const writeAll = (users) => {
  fs.writeFileSync(FILENAME, JSON.stringify(users, null, '  '))
}

module.exports = {
  getUsers,
  writeAll,
}
