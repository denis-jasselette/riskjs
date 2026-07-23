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
  fortifyDestination?: string
  fortifyTroopCount?: number
  maxFortifyTroops?: number
  onFortifyTroopCountChange?: (count: number) => void
  onFortifyConfirm?: () => void
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

  const showFortifySelector = gameState.currentPhase === 'fortify'
    && props.fortifyDestination !== undefined
    && props.maxFortifyTroops !== undefined
    && props.maxFortifyTroops > 0
    && props.fortifyTroopCount !== undefined
    && props.onFortifyTroopCountChange !== undefined
    && props.onFortifyConfirm !== undefined

  const stopPropagation = <T extends { stopPropagation: () => void }>(e: T) => e.stopPropagation()

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
                onClick={(e) => {
                  e.stopPropagation()
                  props.onAttackDiceChange!(n)
                }}
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

      {showFortifySelector && (
        <div className={style.FortifySelectorRow} onClick={stopPropagation}>
          <span className={style.FortifySelectorLabel}>Troops to move:</span>
          <div className={style.FortifyStepper}>
            <button
              type="button"
              className={style.FortifyStepBtn}
              disabled={props.fortifyTroopCount! <= 1}
              onClick={() => props.onFortifyTroopCountChange!(props.fortifyTroopCount! - 1)}
            >
              −
            </button>
            <input
              type="range"
              className={style.FortifySlider}
              min={1}
              max={props.maxFortifyTroops}
              value={props.fortifyTroopCount}
              onChange={e => props.onFortifyTroopCountChange!(Number(e.target.value))}
            />
            <span className={style.FortifyCount}>{props.fortifyTroopCount}</span>
            <button
              type="button"
              className={style.FortifyStepBtn}
              disabled={props.fortifyTroopCount! >= props.maxFortifyTroops!}
              onClick={() => props.onFortifyTroopCountChange!(props.fortifyTroopCount! + 1)}
            >
              +
            </button>
          </div>
          <button
            type="button"
            className={style.FortifyConfirmBtn}
            onClick={() => props.onFortifyConfirm!()}
          >
            Confirm
          </button>
        </div>
      )}
    </div>
  )
}

export default ActionMenu
