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
    <div className={style.ActionMenu}>
      <Avatar
        player={currentPlayerConfig.color}
        isHumanPlayer={currentPlayerConfig.human}
        hasPlayerLost={false}
      />

      <PhaseIndicator
        currentPhase={gameState.currentPhase}
      />

      <PhaseEndButton currentPhase={gameState.currentPhase} handleClick={props.handleEndPhase} />

      {gameState.currentPhase === 'deploy'
      && <>{gameState.troopsToDeploy}</>}
    </div>
  )
}

export default ActionMenu
