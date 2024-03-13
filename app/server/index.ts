import http from 'http'
import { Server, Socket } from 'socket.io'
import EnumMessageType from '../global/message/messageType'
import GameSetting from './constants/gameSetting'
import EnumGameState from './constants/gameState'

const DEFAULT_SETTINGS = {
  maxPlayer: 4,
}

class GameServer {
  private readonly port: number
  private settings: GameSetting
  private readonly server: http.Server
  private readonly io: Server
  private gameState: EnumGameState = EnumGameState.INACTIVE
  private readonly players: Map<Socket, any>

  constructor(port: number, settings: GameSetting = {}) {
    this.port = port
    this.settings = { ...DEFAULT_SETTINGS, ...settings }
    this.server = http.createServer()
    this.io = new Server(this.server)
    this.players = new Map<Socket, any>()
    this.handle()
  }

  private handle() {
    this.io.on('connection', (socket) => {
      this.onPlayerConnect(socket)
      socket.on(EnumMessageType.READY, () => this.onPlayerReady(socket))
      socket.on(EnumMessageType.UNREADY, () => this.onPlayerUnReady(socket))
      socket.on('message', (data) => this.onPlayerMessage(socket, data))
      socket.on(EnumMessageType.DISCONNECT, () =>
        this.onPlayerDisconnect(socket)
      )
    })
  }

  public onPlayerConnect(socket: Socket) {
    console.log('A user connected!')
    if (this.gameState !== EnumGameState.WAITING) return
    this.players.set(socket, {})
  }

  public onPlayerReady(socket: Socket) {
    if (this.gameState !== EnumGameState.WAITING) return
    this.players.get(socket)
  }

  public onPlayerUnReady(socket: Socket) {
    if (this.gameState !== EnumGameState.WAITING) return
    this.players.get(socket)
  }

  public onPlayerMessage(socket: Socket, data: any) {
    console.log('Received message:', data)
  }

  public onPlayerDisconnect(socket: Socket) {
    console.log('A user disconnected!')
  }

  public start() {
    this.server.listen(this.port, () => {
      this.gameState = EnumGameState.WAITING
      console.log('!!!')
    })
  }
}

const server = new GameServer(8080)
server.start()
