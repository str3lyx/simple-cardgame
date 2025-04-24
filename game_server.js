const express = require('express')
const session = require('express-session')
const { createServer } = require('http')
const { Server } = require('socket.io')
const auth = require('./controllers/auth')
const deck = require('./utils/deck')

const gameSession = session({
  secret: 'mp_cardgame',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { maxAge: 300000 },
})

const userValidate = (req, res, next) => {
  if (req.session?.user) {
    return next()
  }
  return res.redirect('/sign-in')
}

const app = express()
app.use(gameSession)
app.use(express.static('public'))
app.use(express.json())
app.set('view engine', 'ejs')

app.post('/api/register', auth.register)
app.post('/api/sign-in', auth.signIn)
app.post('/api/sign-out', auth.signOut)
app.get('/', userValidate, (req, res) => res.render('index'))

const httpServer = createServer(app)
const io = new Server(httpServer)
io.engine.use(gameSession)

io.use((socket, next) => {
  if (socket.request.session?.user) {
    socket.user = socket.request.session.user
    console.log(socket.request.session)
    next()
  } else {
    next(new Error('unauthorized'))
  }
})

const isRunning = false
const players = {}

io.on('connection', (socket) => {
  sendStatus(socket)

  socket.on('join', () => {
    if (isRunning) {
      socket.emit('join_status', {
        err: true,
        msg: 'A game has started. Please try again later.',
      })
      return
    }

    if (Object.keys(players).length >= 4) {
      socket.emit('join_status', {
        err: true,
        msg: 'The game is full already. Please try again later.',
      })
      return
    }

    if (
      Object.values(players).some(
        ({ username }) => username === socket.user.username
      )
    ) {
      socket.emit('join_status', {
        err: true,
        msg: 'The username has already been used in the game.',
      })
      return
    }

    console.log('Join >', socket.user)
    players[socket.id] = {
      socket: socket,
      ...socket.user,
      status: 'waiting',
      cards: [],
    }
    socket.emit('join_status', { err: false })
    sendStatus(io)
    sendPlayersData()
  })

  socket.on('ready', () => {
    if (!isRunning) {
      console.log('Ready >', socket.user)
      players[socket.id].status = 'ready'
      sendPlayersData()

      // all players readied
      if (checkAllPlayerStatus('ready')) {
        deck.init()
        sendToPlayers('start', () => [...deck.draw(5)])
      }
    }
  })

  socket.on('unready', () => {
    if (!isRunning) {
      console.log('Unready >', socket.user)
      players[socket.id].status = 'waiting'
      sendPlayersData()
    }
  })

  socket.on('replace', (cards) => {})

  socket.on('confirm', () => {
    players[socket.id].status = 'confirm'
    sendPlayersData(socket)
    if (checkAllPlayerStatus('confirm')) {
      sendToPlayers('final', () => [...deck.draw(5)])
    }
  })

  socket.on('quit', () => {
    if (socket.id in players) {
      console.log('Quit >', socket.user)
      delete players[socket.id]
      sendStatus(io)
      sendPlayersData(socket)
    }
  })

  socket.on('disconnect', () => {
    if (socket.id in players) {
      console.log('Disconnect >', socket.user)
      delete players[socket.id]
      sendStatus(io)
      sendPlayersData(socket)
    }
  })
})

httpServer.listen(8000)

// ------ //

const checkAllPlayerStatus = (stat) => {
  const playersData = Object.values(players)
  return (
    playersData.length >= 2 &&
    playersData.every(({ status }) => status === stat)
  )
}

const sendStatus = (...sockets) => {
  sockets.forEach((socket) => {
    socket.emit('status', {
      is_running: isRunning,
      players: Object.keys(players).length,
    })
  })
}

const sendToPlayers = (event, data = undefined) => {
  Object.values(players).forEach(({ socket }) => {
    socket.emit(event, typeof data === 'function' ? data() : data)
  })
}

const sendPlayersData = () => {
  const data = Object.entries(players)
  data.forEach(([sid, { socket, ...player }]) => {
    const others = data.filter(([id]) => id !== sid)
    socket.emit('players', {
      self: player,
      players: others.map(([id, { socket, cards, ...p }]) => p),
    })
  })
}
