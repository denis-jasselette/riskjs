import { useContext } from 'preact/hooks'

import GameContext from '@/components/GameContext'
import PlayerInfo from '@/components/playerStatus/PlayerInfo'
import style from '@/components/playerStatus/PlayerStatus.module.scss'
import PlayerConfig from '@/models/PlayerConfig'

const PlayerStatus = () => {
  const { gameState } = useContext(GameContext)

  return (
    <div className={style.PlayerStatusContainer}>
      {gameState.playerConfigs.map((playerConfig: PlayerConfig, playerId: number) =>
        <PlayerInfo key={playerId} playerConfig={playerConfig} />,
      )}
    </div>
  )
}

export default PlayerStatus
