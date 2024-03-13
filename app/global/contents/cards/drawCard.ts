import { EnumCardSuit, SuitCard } from '../card'

class DrawCard extends SuitCard {
  private drawCount: number

  constructor(suit: EnumCardSuit, drawCount: number) {
    super(suit)
    this.drawCount = drawCount
  }

  public override onUsed(): void {}
}

export default DrawCard
