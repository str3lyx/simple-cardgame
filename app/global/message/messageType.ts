const enum EnumMessageType {
  JOIN = 'join',
  READY = 'ready',
  UNREADY = 'unready',
  DISCONNECT = 'disconnect',
  START = 'start',
  TURN = 'turn',
  CARD = 'card',
  PASS = 'pass',
  END = 'end',
}

interface IJoinMessage {
  name: string
}

export { IJoinMessage }
export default EnumMessageType
