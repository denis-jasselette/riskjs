import { useContext } from 'preact/hooks'

import ActionMenu from '@/components/actionMenu/ActionMenu'
import Map from '@/components/board/Map'
import style from '@/components/Game.module.scss'
import GameContext from '@/components/GameContext'
import PlayerStatus from '@/components/playerStatus/PlayerStatus'
import GameController from '@/controllers/GameController'

const Game = () => {
  const { gameState, setGameState } = useContext(GameContext)
  const gameController = new GameController(gameState)

  const handleEndPhase = () => {
    setGameState(gameController.startNextPhase().gameState)
  }

  return (
    <div className={style.Game}>
      <PlayerStatus />
      <ActionMenu handleEndPhase={handleEndPhase} />
      <Map class={style.GameMap} />
    </div>
  )
}

export default Game
