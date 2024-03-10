import { BaseCard } from '../card'

class JokerCard extends BaseCard {
  public override canUseOn(previousCard: BaseCard): boolean {
    return true
  }
}

export default JokerCard
