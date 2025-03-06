import { Socket } from 'net'
import { createInterface } from 'readline/promises'
import { stdin, stdout } from 'process'

const readline = createInterface({ input: stdin, output: stdout })
const ask = async (question) => {
  return await readline.question(question)
}

const GameState = {
  IDLE: 0,
  INPUT_NAME: 1,
  PLAYER_READY: 2,
  GAME_START: 3,
  GAME_PLAYING: 4,
}

const Event = {
  ALL_PLAYERS_READY: 'allPlayersReady',
  GAME_START: 'gameStart',
  RESET: 'reset',
  PLAYER_TURN: 'playerTurn',
  ANNOUNCE: 'announce',
}

const Message = {
  ACK: '',
  CONNECT: 'hello',
  READY: 'ready',
  SETTLE: 'settle',
  STARTED: 'gotten',
  REPLAY: 'play',
  PASS_TURN: 'pass',
  USE_JOKER: '00',
  WIN: 'win', // i also think it's weird but since for backward compat i'll let this slide
}

const ServerMessage = {
  ANNOUNCE: 'announce',
  CONNECTED: 'hello',
  NAME_RECEIVED: 'ok',
  ALL_PLAYERS_READY: 'start',
  GAME_RESET: 'reset',
  PLAYER_TURN: 'turn',
}

// --- //

let state = GameState.IDLE
let cards = []
let joker = 0
let name = ''

const client = new Socket()
client.connect(8080, '127.0.0.1', function () {
  client.write(Message.CONNECT)
})

client.on('data', async (data) => {
  const msg = data.toString()
  const obj = parseJSON(msg)

  if (obj?.cmd === ServerMessage.ANNOUNCE) {
    client.emit(Event.ANNOUNCE, obj?.msg)
    client.write(Message.ACK)
    return
  }

  // state manager
  switch (state) {
    case GameState.IDLE:
      msg === ServerMessage.CONNECTED && askForPlayerName()
      break

    case GameState.INPUT_NAME:
      msg === ServerMessage.NAME_RECEIVED && askForReady()
      break

    case GameState.PLAYER_READY:
      if (msg === ServerMessage.ALL_PLAYERS_READY) {
        client.emit(Event.ALL_PLAYERS_READY)
      }
      break

    case GameState.GAME_START:
      client.emit(Event.GAME_START, obj)
      break

    case GameState.GAME_PLAYING:
      if (obj?.cmd === ServerMessage.PLAYER_TURN) {
        client.emit(Event.PLAYER_TURN, obj?.top)
      }

      if (obj?.cmd === ServerMessage.GAME_RESET) {
        client.emit(Event.RESET)
      }
      break

    default:
      client.destroy()
  }
})

const askForPlayerName = async () => {
  name = await ask('Enter name: ')
  client.write(name)
  state = GameState.INPUT_NAME
}

const askForReady = async () => {
  while (true) {
    const ans = await ask(`${name}, are you ready? (y/N): `)
    if (['y', 'yes'].includes(ans.toLowerCase())) {
      client.write(Message.READY)
      break
    }
  }
  state = GameState.PLAYER_READY
}

client.on(Event.ALL_PLAYERS_READY, async () => {
  client.write(Message.SETTLE)
  state = GameState.GAME_START
})

client.on(Event.GAME_START, async (obj) => {
  console.log('Your card...')
  cards = obj.cards.sort(compareFn)
  joker = obj.joker
  printCardName(null)
  console.log(`You got Turn #${obj.role}`)
  client.write(Message.STARTED)
  state = GameState.GAME_PLAYING
})

client.on(Event.RESET, async () => {
  state = GameState.INPUT_NAME
  cards = []
  joker = 0
  const ans = await ask(`${name}, do you want to play again? (Y/n): `)
  if (['n', 'no'].includes(ans.toLowerCase())) {
    client.destroy()
    return
  }
  client.write(Message.REPLAY)
})

client.on(Event.PLAYER_TURN, async (top) => {
  let err = null
  while (true) {
    try {
      console.log('--------------------------------------')
      console.log('Your Turn')
      console.log('--------------------------------------')
      printCardName(top)
      console.log('--------------------------------------')
      printTableTop(top)
      console.log('--------------------------------------')

      // if error occured previously
      if (err) {
        console.log(`!!! ${err} !!!`)
        console.log('--------------------------------------')
      }

      if (!hasValidCard(top)) {
        if (joker <= 0) {
          console.log('No usable card. Automatically pass turn.')
          client.write(Message.PASS_TURN)
          return
        }

        console.log(`No usable card except "${getCardFullName('00')}".`)
        const useJoker = await ask(`Would you like to use it? (Y/n)\n> `)
        if (['n', 'no'].includes(useJoker.toLowerCase())) {
          passTurn()
          return
        }

        useJokerCard()
        return
      }

      console.log('Pick your card (or press "9" to pass your turn)')
      const choice = await ask('> ')

      switch (choice) {
        case '9':
          passTurn()
          return

        case '0':
          useJokerCard()
          return

        default:
          useCard(choice, top)
      }
    } catch (error) {
      err = error
    }
  }
})

client.on(Event.ANNOUNCE, (msg) => {
  if (msg === 'disconnected') {
    console.log('Game ends due to some player disconnected.')
    client.destroy()
    return
  }
  console.log(msg)
})

client.on('close', () => {
  console.log('Server terminated')
  readline.close()
})

client.on('error', console.error)

// --------------------------------------------------------------------------------------------- //

const parseJSON = (json) => {
  try {
    return JSON.parse(json)
  } catch (_) {
    return {}
  }
}

const passTurn = () => {
  console.log('You passed your turn.')
  client.write(Message.PASS_TURN)
}

const useJokerCard = () => {
  if (joker <= 0) {
    throw 'Invalid Character: No Joker Card'
  }
  joker -= 1
  console.log(`You used the "${getCardFullName('00')}".`)
  sendCard('00')
}

const useCard = (choice, top) => {
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const index = ALPHABET.indexOf(choice.toUpperCase())

  // index out of bound
  if (index >= cards.length || index < 0) {
    throw 'Invalid Character: Out of range'
  }

  // not usable
  const card = cards[index]
  if (!isValidCard(card, top)) {
    throw `${getCardName(card)}'s honer is lower than ${getCardName(top)}'s.`
  }
  cards.splice(index, 1)
  sendCard(card)
}

const sendCard = (card) => {
  if (cards.length <= 0 && joker <= 0) client.write(Message.WIN)
  else client.write(card)
}

const printCardName = (top) => {
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const gray = (str) => `\x1b[90m${str}\x1b[0m`
  const yellow = (str) => `\x1b[93m${str}\x1b[0m`

  const cardChoices = cards.map((card, i) => {
    const choice = `${ALPHABET.at(i)}. ${getCardName(card).padStart(3, ' ')}`
    const colorFn = isValidCard(card, top) ? yellow : gray
    return colorFn(choice)
  })

  while (cardChoices.length) {
    const row = cardChoices.splice(0, 6).join('    ')
    console.log(row)
  }

  if (joker > 0) console.log(`0. ${getCardName('00')}`)
}

const splitCard = (card) => {
  if (card === '00') return ['00', '00']
  const number = card.slice(0, -1)
  const suit = card.slice(-1)
  return [number, suit]
}

const getSuit = (suit) => {
  const SUIT = {
    s: ['♠', 'Spade'],
    h: ['♥', 'Heart'],
    d: ['♦', 'Diamond'],
    c: ['♣', 'Club'],
  }
  return SUIT[suit] || ['', '']
}

const getNumber = (number) => {
  const NUMBER = {
    13: ['K', 'King'],
    12: ['Q', 'Queen'],
    11: ['J', 'Jack'],
    10: ['10', 'Ten'],
    9: ['9', 'Nine'],
    8: ['8', 'Eight'],
    7: ['7', 'Seven'],
    6: ['6', 'Six'],
    5: ['5', 'Five'],
    4: ['4', 'Four'],
    3: ['3', 'Three'],
    2: ['2', 'Two'],
    1: ['A', 'Ace'],
  }
  return NUMBER[number] || ['', '']
}

const getCardName = (card) => {
  if (card === '00') return 'JOKER'
  const [number, suit] = splitCard(card)
  return `${getNumber(number)[0]}${getSuit(suit)[0]}`
}

const getCardFullName = (card) => {
  if (card === '00') return 'Joker Card'
  const [number, suit] = splitCard(card)
  const fullName = `${getNumber(number)[1]} of ${getSuit(suit)[1]}`
  return `${fullName} (${getCardName(card)})`
}

const printTableTop = (top) => {
  const boldYellow = (str) => `\x1b[93;1m${str}\x1b[0m`
  top && console.log(`Table Top is "${boldYellow(getCardFullName(top))}".`)
  if (!top || top === '00') {
    console.log('You can choose any card.')
  }
}

const isValidCard = (card, top) => {
  return !top || top === '00' || card === '00' || compareFn(card, top) > 0
}

const hasValidCard = (top) => {
  return cards.some((card) => isValidCard(card, top))
}

const compareFn = (a, b) => {
  if (!a && !b) return 0
  if (!b) return 1
  if (!a) return -1

  const SUIT_TABLES = ['c', 'd', 'h', 's']

  const [numberA, suitA] = splitCard(a)
  const [numberB, suitB] = splitCard(b)

  if (numberA === numberB) {
    return (
      SUIT_TABLES.findIndex((suit) => suit === suitA) -
      SUIT_TABLES.findIndex((suit) => suit === suitB)
    )
  }
  return numberA - numberB
}
