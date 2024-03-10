import BaseCard from './card/baseCard'

class BaseDeck {
  private cards: BaseCard[] = []

  constructor(cards: BaseCard[]) {
    this.cards = cards
  }

  public getCards(): BaseCard[] {
    return this.cards
  }
}

class Deck extends BaseDeck {
  constructor() {
    super([])
  }
}

export { Deck }
