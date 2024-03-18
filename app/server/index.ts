import http from 'http'
import { Server, Socket } from 'socket.io'
import Player from '../global/contents/player'
import EnumMessageType, { IJoinMessage } from '../global/message/messageType'
import GameSetting from './constants/gameSetting'
import EnumGameState from './constants/gameState'

const DEFAULT_SETTINGS = {
  minPlayer: 4,
  maxPlayer: 4,
}

class GameServer {
  private readonly port: number
  private settings: GameSetting
  private readonly server: http.Server
  private readonly io: Server
  private gameState: EnumGameState = EnumGameState.INACTIVE
  private readonly players: Map<Socket, any>
  private readyPlayer: number

  constructor(port: number, settings: GameSetting = {}) {
    this.port = port
    this.settings = { ...DEFAULT_SETTINGS, ...settings }
    this.server = http.createServer()
    this.io = new Server(this.server)
    this.readyPlayer = 0
    this.players = new Map<Socket, any>()
    this.handle()
  }

  private handle() {
    this.io.on('connection', (socket) => {
      socket.on(EnumMessageType.JOIN, (data: IJoinMessage) =>
        this.onPlayerJoin(socket, data.name)
      )
      socket.on(EnumMessageType.READY, () => this.onPlayerReady(socket))
      socket.on(EnumMessageType.UNREADY, () => this.onPlayerUnReady(socket))
      socket.on(EnumMessageType.START, () => this.onPlayerFinishSetup(socket))
      socket.on('message', (data) => this.onPlayerMessage(socket, data))
      socket.on(EnumMessageType.DISCONNECT, () =>
        this.onPlayerDisconnect(socket)
      )
    })
  }

  public onPlayerJoin(socket: Socket, name: string) {
    if (this.gameState !== EnumGameState.LOBBY) return
    if (this.players.size >= (this.settings.maxPlayer || 4)) return
    this.players.set(socket, new Player(name))
  }

  public onPlayerReady(socket: Socket) {
    if (this.gameState !== EnumGameState.LOBBY) return
    const player = this.players.get(socket)
    if (player) {
      player.isReady = true
      this.readyPlayer++
      if (this.readyPlayer >= (this.settings.minPlayer || 4)) {
      }
    }
  }

  public onPlayerUnReady(socket: Socket) {
    if (this.gameState !== EnumGameState.LOBBY) return
    const player = this.players.get(socket)
    if (player) {
      player.isReady = false
      this.readyPlayer--
    }
  }

  public onPlayerFinishSetup(socket: Socket) {
    if (this.gameState !== EnumGameState.SETUP) return
  }

  public onPlayerReceiveTurn(socket: Socket) {}

  public onPlayerUseCard(socket: Socket) {}

  public onPlayerPassTurn(socket: Socket) {}

  public onPlayerMessage(socket: Socket, data: any) {
    console.log('Received message:', data)
  }

  public onPlayerDisconnect(socket: Socket) {
    console.log('A user disconnected!')
  }

  public start() {
    this.server.listen(this.port, () => {
      this.gameState = EnumGameState.LOBBY
      console.log('!!!')
    })
  }
}

const server = new GameServer(8080)
server.start()
