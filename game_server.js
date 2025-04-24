const express = require('express')
const session = require('express-session')
const { createServer } = require('http')
const { Server } = require('socket.io')
const auth = require('./controllers/auth')
const deck = require('./utils/deck')
const { createPokerHand, getEvaluatedScore } = require('poker-hand-utils')

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
    next()
  } else {
    next(new Error('unauthorized'))
  }
})

let isRunning = false
let players = {}

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
      times: 2,
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
        isRunning = true
        for (let sid in players) {
          const player = players[sid]
          player.cards = [...deck.draw(5)]
          player.socket.emit('start', player.cards)
        }
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

  socket.on('replace', (cards) => {
    const player = players[socket.id]
    if (isRunning || player.status === 'ready') {
      console.log(cards)
      if (player.times <= 0) {
        socket.emit('replaced', {
          err: 'Your replace quota is exceeded.',
          cards: player.cards,
        })
        return
      }

      cards = cards.filter((card) => player.cards.indexOf(card) >= 0)
      if (cards.length > 0) {
        player.cards = [
          ...player.cards.filter((card) => cards.indexOf(card) == -1),
          ...deck.replace(cards),
        ]
        player.times -= 1
        socket.emit('replaced', { cards: player.cards })
      } else {
        socket.emit('replaced', {
          err: 'You choose no card.',
          cards: player.cards,
        })
        return
      }
    }
  })

  socket.on('confirm', () => {
    const player = players[socket.id]
    if (isRunning || player.status === 'ready') {
      console.log('Confirm >', socket.user)
      players[socket.id].status = 'confirm'
      sendPlayersData(socket)
      if (checkAllPlayerStatus('confirm')) {
        revealPlayersData()
        setUp()
      }
    }
  })

  socket.on('quit', () => {
    if (socket.id in players) {
      console.log('Quit >', socket.user)
      delete players[socket.id]
      if (isRunning) {
        Object.values(players).forEach(({ socket }) => socket.emit('out'))
        setUp()
        return
      }
      sendStatus(io)
      sendPlayersData(socket)
    }
  })

  socket.on('disconnect', () => {
    if (socket.id in players) {
      console.log('Disconnect >', socket.user)
      delete players[socket.id]
      if (isRunning) {
        Object.values(players).forEach(({ socket }) => socket.emit('out'))
        setUp()
        return
      }
      sendStatus(io)
      sendPlayersData(socket)
    }
  })
})

httpServer.listen(8000)

// ------ //

const setUp = () => {
  isRunning = false
  players = {}
}

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

const revealPlayersData = () => {
  const data = Object.entries(players)
  data.forEach(([sid, { socket, ...player }]) => {
    const others = data.filter(([id]) => id !== sid)
    socket.emit('final', {
      self: player,
      winner: findWinner(),
      players: others.map(([id, { socket, ...p }]) => p),
    })
  })
}

const findWinner = () => {
  const playersData = Object.values(players).map((player) => ({
    ...player,
    score: getEvaluatedScore(createPokerHand(player.cards.join(' '))),
  }))
  playersData.sort((a, b) => a.score - b.score)
  console.log(playersData)
  const winner = playersData.at(-1)
  return winner ? { username: winner.username, name: winner.name } : null
}
