import { useContext } from 'react'

import style from '@/components/actionMenu/ActionMenu.module.scss'
import PhaseEndButton from '@/components/actionMenu/PhaseEndButton'
import { PhaseIndicator } from '@/components/actionMenu/PhaseIndicator'
import Avatar from '@/components/Avatar'
import GameContext from '@/components/GameContext'

export interface ActionMenuProps {
  handleEndPhase: () => void
  attackDiceCount?: number
  maxAttackDice?: number
  onAttackDiceChange?: (count: number) => void
}

const ActionMenu = (props: ActionMenuProps) => {
  const { gameState } = useContext(GameContext)
  const currentPlayerConfig = gameState.playerConfigs.find(x => x.color === gameState.currentPlayer)
  if (!currentPlayerConfig)
    return <></>

  const showDiceSelector = gameState.currentPhase === 'attack'
    && props.maxAttackDice !== undefined
    && props.maxAttackDice > 0
    && props.attackDiceCount !== undefined
    && props.onAttackDiceChange !== undefined

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

        {showDiceSelector && (
          <div className={style.DiceSelector}>
            <span className={style.DiceSelectorLabel}>Dice:</span>
            {[1, 2, 3].map(n => (
              <button
                key={n}
                className={`${style.DiceSelectorBtn}${props.attackDiceCount === n ? ` ${style.DiceSelectorBtnActive}` : ''}`}
                disabled={n > props.maxAttackDice!}
                onClick={(e) => { e.stopPropagation(); props.onAttackDiceChange!(n) }}
              >
                {n}
              </button>
            ))}
          </div>
        )}

        <div className={style.PhaseEndButton}>
          <PhaseEndButton currentPhase={gameState.currentPhase} handleClick={props.handleEndPhase} />
        </div>
      </div>
    </div>
  )
}

export default ActionMenu
