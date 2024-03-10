abstract class BaseCard {
  constructor() {}

  public canUseOn(previousCard: BaseCard): boolean {
    return true
  }

  public onUsed() {}
}

enum EnumCardSuit {
  SPADE,
  HEART,
  DIAMOND,
  CLUB,
}

abstract class SuitCard extends BaseCard {
  protected suit: EnumCardSuit

  constructor(suit: EnumCardSuit) {
    super()
    this.suit = suit
  }

  public override canUseOn(previousCard: BaseCard): boolean {
    if (previousCard instanceof SuitCard) {
      return this.suit == previousCard.suit
    }
    return super.canUseOn(previousCard)
  }
}

export { EnumCardSuit, BaseCard, SuitCard }
