import { BaseCard } from '../contents/card'

class GameRegistry {
  private static dataMap = new Map<BaseCard, string>()

  public static register(card: BaseCard) {}
}

export default GameRegistry
