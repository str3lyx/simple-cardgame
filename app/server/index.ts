import http from 'http'
import { Server, Socket } from 'socket.io'
import EnumGameState from './enums/EnumGameState'
import GameSetting from './types/GameSetting'

const DEFAULT_SETTINGS = {
  maxPlayer: 4,
}

class GameServer {
  private host: string
  private port: number
  private settings: GameSetting
  private server: http.Server
  private io: Server
  private gameState: EnumGameState = EnumGameState.WAITING

  constructor(host: string, port: number, settings: GameSetting = {}) {
    this.host = host
    this.port = port
    this.settings = { ...DEFAULT_SETTINGS, ...settings }
    this.server = http.createServer()
    this.io = new Server(this.server)
    this.handle()
  }

  private handle() {
    this.io.on('connection', (socket) => {
      this.onPlayerConnect(socket)
      socket.on('message', (data) => this.onPlayerMessage(socket, data))
      socket.on('disconnect', () => this.onPlayerDisconnect(socket))
    })
  }

  public onPlayerConnect(socket: Socket) {
    console.log('A user connected!')
  }

  public onPlayerMessage(socket: Socket, data: any) {
    console.log('Received message:', data)
  }

  public onPlayerDisconnect(socket: Socket) {
    console.log('A user disconnected!')
  }

  public start() {
    this.server.listen(this.port, this.host, () => {
      console.log('!!!')
    })
  }
}

const server = new GameServer('127.0.0.1', 8080)
server.start()
