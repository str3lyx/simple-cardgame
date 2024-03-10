import { EnumCardSuit, SuitCard } from '../card'

class SkipCard extends SuitCard {
  private skipTurn: number

  constructor(suit: EnumCardSuit, skipTurn: number) {
    super(suit)
    this.skipTurn = skipTurn
  }

  public override onUsed(): void {}
}

export default SkipCard
