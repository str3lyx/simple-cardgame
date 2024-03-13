import { io, Socket } from 'socket.io-client'

class GameClient {
  private readonly socket: Socket

  constructor(url: string, port: number) {
    this.socket = io(`${url}:${port}`)
  }

  public connect() {
    this.socket.on('connect', () => {
      console.log('Connected to server')
    })
  }

  public disconnect() {
    this.socket.disconnect()
  }
}

const client = new GameClient('http://127.0.0.1', 8080)
client.connect()
