let decks = []

const SIGNS = ['S', 'H', 'D', 'C']
const NUMS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K']

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

export const replace = (cards) => {
  const num = cards.length
  decks = shuffle([...decks, ...cards])
  return [...draw(num)]
}

export const draw = function* (times = 1) {
  for (let i = 0; i < times; i++) {
    yield decks.pop(0)
  }
}
