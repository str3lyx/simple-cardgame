import { EnumCardSuit, SuitCard } from '../card'

class ReverseCard extends SuitCard {
  constructor(suit: EnumCardSuit) {
    super(suit)
  }

  public override onUsed(): void {}
}

export default ReverseCard
