import classicMapConfig from '@/assets/maps/classic/config.json'
import GameLogic from '@/controllers/GameLogic'
import { shuffled } from '@/lib/Random'
import MapConfig from '@/models/MapConfig'
import PlayerConfig, { PlayerColorValues } from '@/models/PlayerConfig'

import { HandlerContext, requireHostRoom } from './context'

const mapConfig = classicMapConfig as MapConfig

export function handleStartGame(ctx: HandlerContext): void {
  const room = requireHostRoom(ctx)
  if (!room) return
  if (room.status === 'started') {
    ctx.connection.send({ type: 'error', payload: { message: 'Game already started.' } })
    return
  }

  const colors = shuffled(PlayerColorValues)
  const playerConfigs: PlayerConfig[] = room.seats.map((seat, i) => {
    const color = colors[i]
    seat.color = color
    return {
      currentUser: false,
      name: seat.nickname ?? `Open seat ${seat.index + 1}`,
      color,
      human: seat.nickname !== null,
      position: i + 1,
    }
  })

  room.gameState = GameLogic.initState(mapConfig, playerConfigs, room.settings.blizzards, false, room.settings.fog)
  room.status = 'started'
  room.touch()

  room.broadcast({
    type: 'game_started',
    payload: { seats: room.startedSeats(), settings: room.settings, gameState: room.gameState },
  })
}
