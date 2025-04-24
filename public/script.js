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
  $('#self-hand').empty()
  $('#player1-hand').empty()
  $('#player2-hand').empty()
  $('#player3-hand').empty()

  cards.forEach((card) => {
    $('#self-hand').append(renderCard(card))
  })
  Array.from({ length: 5 }).forEach(() => {
    $('#player1-hand').append(renderCard(''))
    $('#player2-hand').append(renderCard(''))
    $('#player3-hand').append(renderCard(''))
  })
})

socket.on('replaced', ({ err, cards }) => {
  replaces = []
  if (err) {
    alert(err)
  }
  $('#self-hand').empty()
  cards.forEach((card) => {
    $('#self-hand').append(renderCard(card))
  })
})

socket.on('final', (data) => {
  $('#self-hand').empty()
  $('#player1-hand').empty()
  $('#player2-hand').empty()
  $('#player3-hand').empty()

  data.self.cards.forEach((card) => {
    $('#self-hand').append(renderCard(card))
  })

  const hands = ['#player1-hand', '#player2-hand', '#player3-hand']
  data.players.forEach((player, i) => {
    player.cards.forEach((card) => {
      $(hands[i]).append(renderCard(card))
    })
  })
  $('#btn-ready').hide()
  $('#btn-unready').hide()
  $('#btn-quit').hide()
  $('#btn-replace').hide()
  $('#btn-confirm').hide()

  socket.disconnect()
  setTimeout(() => {
    window.location.reload()
  }, 8000)
})

socket.on('out', () => {
  window.location.reload()
})

// ------ //

let replaces = []

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
    AS: '🂡',
    '2S': '🂢',
    '3S': '🂣',
    '4S': '🂤',
    '5S': '🂥',
    '6S': '🂦',
    '7S': '🂧',
    '8S': '🂨',
    '9S': '🂩',
    TS: '🂪',
    JS: '🂫',
    QS: '🂭',
    KS: '🂮',
    AH: '🂱',
    '2H': '🂲',
    '3H': '🂳',
    '4H': '🂴',
    '5H': '🂵',
    '6H': '🂶',
    '7H': '🂷',
    '8H': '🂸',
    '9H': '🂹',
    TH: '🂺',
    JH: '🂻',
    QH: '🂽',
    KH: '🂾',
    AD: '🃁',
    '2D': '🃂',
    '3D': '🃃',
    '4D': '🃄',
    '5D': '🃅',
    '6D': '🃆',
    '7D': '🃇',
    '8D': '🃈',
    '9D': '🃉',
    TD: '🃊',
    JD: '🃋',
    QD: '🃍',
    KD: '🃎',
    AC: '🃑',
    '2C': '🃒',
    '3C': '🃓',
    '4C': '🃔',
    '5C': '🃕',
    '6C': '🃖',
    '7C': '🃗',
    '8C': '🃘',
    '9C': '🃙',
    TC: '🃚',
    JC: '🃛',
    QC: '🃝',
    KC: '🃞',
  }
  const div = $('<div class="card"></div>')
  div.text(CARDS[card] || '🂠')
  div.on('click', () => {
    if (div.hasClass('flip')) {
      div.removeClass('flip')
      div.text(CARDS[card] || '🂠')
      let i = replaces.indexOf(card)
      if (i >= 0) replaces.pop(i)
    } else {
      div.addClass('flip')
      div.text('🂠')
      replaces.push(card)
    }
  })
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

function replace() {
  socket.emit('replace', replaces)
}

function confirmMove() {
  socket.emit('confirm')
  $('#stop').show()
  $('#btn-ready').hide()
  $('#btn-unready').hide()
  $('#btn-quit').hide()
  $('#btn-replace').hide()
  $('#btn-confirm').hide()
}
