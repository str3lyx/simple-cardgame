import { io, Socket } from 'socket.io-client'
import { createInterface, Interface } from 'readline'
import EnumMessageType from '../global/message/messageType'

class GameClient {
  private readonly socket: Socket
  private readonly interface: Interface

  constructor(url: string, port: number) {
    this.socket = io(`${url}:${port}`)
    this.interface = createInterface({
      input: process.stdin,
      output: process.stdout,
    })
  }

  public connect() {
    this.socket.on('connect', () => {
      this.interface.question('Enter your name: ', (name) => {
        this.socket.emit(EnumMessageType.JOIN, { name: name })
      })
    })
  }

  public disconnect() {
    this.socket.disconnect()
  }
}

const client = new GameClient('http://127.0.0.1', 8080)
client.connect()
