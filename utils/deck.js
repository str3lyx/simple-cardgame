let decks = []

const SIGNS = ['s', 'h', 'd', 'c']
const NUMS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

export const init = () => {
  decks = shuffle(SIGNS.flatMap((sign) => NUMS.map((num) => `${num}${sign}`)))
  return decks
}

export const shuffle = (arr) => {
  const shuffledArray = [...arr]
  const n = shuffledArray.length

  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]]
  }
  return shuffledArray
}

export const draw = function* (times = 1) {
  for (let i = 0; i < times; i++) {
    yield decks.pop(0)
  }
}
