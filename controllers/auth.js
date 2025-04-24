const argon2 = require('argon2')
const { getUsers, writeAll } = require('../utils/db')

const containWordCharsOnly = (text) => {
  return /^\w+$/.test(text)
}

const register = async (req, res) => {
  const { username, name, password, password2 } = req.body

  if (!(username && name && password && password2)) {
    return res
      .status(400)
      .json({ error: 'Username/name/password cannot be empty.' })
  }

  if (password !== password2) {
    return res.status(400).json({ error: 'Password mismatched' })
  }

  if (!containWordCharsOnly(username)) {
    return res.status(400).json({
      error: 'Username can only contain underscores, letters or numbers.',
    })
  }

  const users = getUsers()
  if (username in users) {
    return res.status(400).json({ error: 'Username has already been used.' })
  }

  const hash = await argon2.hash(password)
  users[username] = {
    name: name,
    password: hash,
  }

  writeAll(users)
  return res.status(201).json({ username: username, name: name })
}

const signIn = async (req, res) => {
  const { username, password } = req.body
  const users = getUsers()

  if (!users[username]) {
    return res.status(400).json({ error: 'Incorrect username/password.' })
  }

  const verified = await argon2.verify(users[username].password, password)
  if (!verified) {
    res.status(400).json({ error: 'Incorrect username/password.' })
    return
  }

  const userData = {
    username: username,
    name: users[username].name,
  }
  req.session.user = userData
  return res.status(200).json(userData)
}

const signOut = (req, res) => {
  if (req.session.user) {
    delete req.session.user
  }
  return res.status(200).send()
}

module.exports = {
  register,
  signIn,
  signOut,
}
