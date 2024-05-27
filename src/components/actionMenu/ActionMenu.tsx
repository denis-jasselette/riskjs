import { useContext } from 'preact/hooks'

import style from '@/components/actionMenu/ActionMenu.module.scss'
import PhaseEndButton from '@/components/actionMenu/PhaseEndButton'
import { PhaseIndicator } from '@/components/actionMenu/PhaseIndicator'
import Avatar from '@/components/Avatar'
import GameContext from '@/components/GameContext'

export interface ActionMenuProps {
  handleEndPhase: () => void
}

const ActionMenu = (props: ActionMenuProps) => {
  const { gameState } = useContext(GameContext)
  const currentPlayerConfig = gameState.playerConfigs.find(x => x.color === gameState.currentPlayer)
  if (!currentPlayerConfig)
    return <></>

  return (
    <div className={style.ActionMenuContainer}>
      <div className={style.ActionMenu}>
        <div className={style.Avatar}>
          <Avatar
            player={currentPlayerConfig.color}
            isHumanPlayer={currentPlayerConfig.human}
            hasPlayerLost={false}
          />
        </div>

        <div className={style.PhaseIndicator}>
          <PhaseIndicator
            currentPhase={gameState.currentPhase}
            troopsToDeploy={gameState.troopsToDeploy}
          />
        </div>

        <div className={style.PhaseEndButton}>
          <PhaseEndButton currentPhase={gameState.currentPhase} handleClick={props.handleEndPhase} />
        </div>
      </div>
    </div>
  )
}

export default ActionMenu
