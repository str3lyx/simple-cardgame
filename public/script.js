const socket = io()

socket.on('connect_error', (err) => console.error(err.message))
socket.on('connect', () => {
  console.log('Connected!')
})

socket.on('status', ({ is_running, players }) => {
  $('#btn-join').prop('disabled', is_running || players >= 4)
  if (is_running) {
    $('#room-status').text('In Game !!!')
    return
  }

  if (players >= 4) {
    $('#room-status').text('Full !!!')
    return
  }

  $('#room-status').text(`${players} player${players > 1 ? 's' : ''}`)
})

socket.on('join_status', ({ err, msg }) => {
  if (err) {
    $('#join-message').text(msg || '')
  } else {
    $('#join-message').text('')
    $('#main').hide()
    $('#waiting-room').show()
    $('#btn-ready').show()
    $('#btn-unready').hide()
    $('#btn-quit').show()
    $('#btn-replace').hide()
    $('#btn-confirm').hide()
  }
})

socket.on('players', (players) => {
  const elements = [
    ['#player1', '#player1-name', '#player1-hand', '#player1-status'],
    ['#player2', '#player2-name', '#player2-hand', '#player2-status'],
    ['#player3', '#player3-name', '#player3-hand', '#player3-status'],
  ]
  console.log(players)
  // self
  $('#self-name').text(`You (${players.self.name})`)
  $('#self-status').text(displayStatus(players.self.status))
  // others
  elements.forEach(([e]) => $(e).hide())
  players.players.forEach((player, i) => {
    const [base, name, hand, status] = elements[i]
    $(base).show()
    $(name).text(player.name)
    $(status).text(displayStatus(player.status))
  })
})

socket.on('start', (cards) => {
  console.log(cards)
  $('#btn-ready').hide()
  $('#btn-unready').hide()
  $('#btn-quit').hide()
  $('#btn-replace').show()
  $('#btn-confirm').show()
  // render
  cards.forEach((card) => {
    $('#self-hand').append(renderCard(card))
  })
  Array.from({ length: 5 }).forEach(() => {
    $('#player1-hand').append(renderCard(''))
    $('#player2-hand').append(renderCard(''))
    $('#player3-hand').append(renderCard(''))
  })
})

socket.on('final', () => {
  socket.disconnect()
  setTimeout(() => {
    window.location.reload()
  }, 5000)
})

// ------ //

const displayStatus = (status) => {
  switch (status) {
    case 'ready':
      return 'READIED'
    case 'confirm':
      return 'CONFIRM'
  }
  return ''
}

const renderCard = (card) => {
  const CARDS = {
    '1s': '🂡',
    '2s': '🂢',
    '3s': '🂣',
    '4s': '🂤',
    '5s': '🂥',
    '6s': '🂦',
    '7s': '🂧',
    '8s': '🂨',
    '9s': '🂩',
    '10s': '🂪',
    Js: '🂫',
    Qs: '🂭',
    Ks: '🂮',
    '1h': '🂱',
    '2h': '🂲',
    '3h': '🂳',
    '4h': '🂴',
    '5h': '🂵',
    '6h': '🂶',
    '7h': '🂷',
    '8h': '🂸',
    '9h': '🂹',
    '10h': '🂺',
    Jh: '🂻',
    Qh: '🂽',
    Kh: '🂾',
    '1d': '🃁',
    '2d': '🃂',
    '3d': '🃃',
    '4d': '🃄',
    '5d': '🃅',
    '6d': '🃆',
    '7d': '🃇',
    '8d': '🃈',
    '9d': '🃉',
    '10d': '🃊',
    Jd: '🃋',
    Qd: '🃍',
    Kd: '🃎',
    '1c': '🃑',
    '2c': '🃒',
    '3c': '🃓',
    '4c': '🃔',
    '5c': '🃕',
    '6c': '🃖',
    '7c': '🃗',
    '8c': '🃘',
    '9c': '🃙',
    '10c': '🃚',
    Jc: '🃛',
    Qc: '🃝',
    Kc: '🃞',
  }
  const div = $('<div class="card"></div>')
  div.text(CARDS[card] || '🂠')
  return div
}

// ------ //

function signOut() {
  fetch('/api/sign-out', { method: 'POST' }).then(() => {
    window.location.reload()
  })
}

function join() {
  socket.emit('join', { username: '', name: '' })
}

function quit() {
  socket.emit('quit')
  $('#main').show()
  $('#waiting-room').hide()
  $('#btn-ready').hide()
  $('#btn-unready').hide()
  $('#btn-quit').hide()
  $('#btn-replace').hide()
  $('#btn-confirm').hide()
}

function ready() {
  $('#btn-ready').hide()
  $('#btn-unready').show()
  $('#btn-quit').show()
  $('#btn-replace').hide()
  $('#btn-confirm').hide()
  socket.emit('ready')
}

function unready() {
  $('#btn-ready').show()
  $('#btn-unready').hide()
  $('#btn-quit').show()
  $('#btn-replace').hide()
  $('#btn-confirm').hide()
  socket.emit('unready')
}

function confirmMove() {
  alert('aaa')
  socket.emit('confirm')
}
