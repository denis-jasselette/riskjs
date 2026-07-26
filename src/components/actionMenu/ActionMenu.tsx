import { useContext } from 'react'

import style from '@/components/actionMenu/ActionMenu.module.scss'
import PhaseEndButton from '@/components/actionMenu/PhaseEndButton'
import { PhaseIndicator } from '@/components/actionMenu/PhaseIndicator'
import Avatar from '@/components/Avatar'
import GameContext from '@/components/GameContext'
import GameController from '@/controllers/GameController'

// The custom-styled range sliders below draw their own track (no native
// fill), so the filled-vs-remaining split communicating the current value's
// position relative to min/max is painted here instead, via a gradient on
// the track background.
const sliderTrackFill = (min: number, max: number, value: number): string => {
  const percent = max > min ? ((value - min) / (max - min)) * 100 : 100
  return `linear-gradient(to right, var(--primary-color) ${percent}%, var(--modal-border-color) ${percent}%)`
}

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
  deployTroopCount?: number
  maxDeployTroops?: number
  onDeployTroopCountChange?: (count: number) => void
  postConquestTroopCount?: number
  onPostConquestTroopCountChange?: (count: number) => void
  onPostConquestConfirm?: () => void
  onResign?: () => void
}

const ActionMenu = (props: ActionMenuProps) => {
  const { gameState, viewingPlayer } = useContext(GameContext)
  const gameController = new GameController(gameState)
  const currentPlayerConfig = gameState.playerConfigs.find(x => x.color === gameState.currentPlayer)
  if (!currentPlayerConfig)
    return <></>

  // Resignation is allowed at any time, regardless of whose turn it
  // currently is (FR-008) -- gated only on the viewer not already being
  // resigned, defeated, or the game having already ended.
  const canResign = props.onResign !== undefined
    && !gameState.gameOver
    && !gameController.hasPlayerLost(viewingPlayer)
    && !gameController.isResigned(viewingPlayer)

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

  const showDeploySelector = gameState.currentPhase === 'deploy'
    && props.maxDeployTroops !== undefined
    && props.maxDeployTroops > 0
    && props.deployTroopCount !== undefined
    && props.onDeployTroopCountChange !== undefined
    && !gameController.hasForcedTradeIn()

  const showCapitalPrompt = gameState.currentPhase === 'capitalDeploy'

  // Post-conquest troop movement (024): shown whenever a choice is pending
  // (only ever set during the attack phase -- see attack()'s conquest
  // branch). The lower bound (minTroopsToMove) is read directly off the
  // pending state; the upper bound is never stored, and is instead
  // recomputed live from the two territories' current troop counts (their
  // combined pool is fixed once combat ends -- only its split changes).
  const pendingPostConquestMove = gameState.pendingPostConquestMove
  const minPostConquestTroops = pendingPostConquestMove?.minTroopsToMove ?? 1
  const maxPostConquestTroops = pendingPostConquestMove
    ? gameController.getTroopCount(pendingPostConquestMove.sourceTerritory) + gameController.getTroopCount(pendingPostConquestMove.conqueredTerritory) - 1
    : 1

  const showPostConquestSelector = !!pendingPostConquestMove
    && props.postConquestTroopCount !== undefined
    && props.onPostConquestTroopCountChange !== undefined
    && props.onPostConquestConfirm !== undefined

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

        {canResign && (
          <div className={style.ResignButton}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (window.confirm('Are you sure you want to resign? Your territories stay on the board, but you\'ll never take another turn.'))
                  props.onResign!()
              }}
            >
              Resign
            </button>
          </div>
        )}
      </div>

      {showCapitalPrompt && (
        <div className={style.CapitalPromptRow} onClick={stopPropagation}>
          <span className={style.CapitalPromptLabel}>
            {currentPlayerConfig.name}
            , choose one of your territories as your capital
          </span>
        </div>
      )}

      {showPostConquestSelector && (
        <div className={style.PostConquestSelectorRow} onClick={stopPropagation}>
          <span className={style.PostConquestSelectorLabel}>Troops to move in:</span>
          <div className={style.PostConquestStepper}>
            <button
              type="button"
              className={style.PostConquestStepBtn}
              disabled={props.postConquestTroopCount! <= minPostConquestTroops}
              onClick={() => props.onPostConquestTroopCountChange!(props.postConquestTroopCount! - 1)}
            >
              −
            </button>
            <input
              type="range"
              className={style.PostConquestSlider}
              style={{ background: sliderTrackFill(minPostConquestTroops, maxPostConquestTroops, props.postConquestTroopCount!) }}
              min={minPostConquestTroops}
              max={maxPostConquestTroops}
              value={props.postConquestTroopCount}
              onChange={e => props.onPostConquestTroopCountChange!(Number(e.target.value))}
            />
            <span className={style.PostConquestCount}>{props.postConquestTroopCount}</span>
            <button
              type="button"
              className={style.PostConquestStepBtn}
              disabled={props.postConquestTroopCount! >= maxPostConquestTroops}
              onClick={() => props.onPostConquestTroopCountChange!(props.postConquestTroopCount! + 1)}
            >
              +
            </button>
          </div>
          <button
            type="button"
            className={style.PostConquestConfirmBtn}
            onClick={() => props.onPostConquestConfirm!()}
          >
            Confirm
          </button>
        </div>
      )}

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
              style={{ background: sliderTrackFill(1, props.maxFortifyTroops!, props.fortifyTroopCount!) }}
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

      {showDeploySelector && (
        <div className={style.DeploySelectorRow} onClick={stopPropagation}>
          <span className={style.DeploySelectorLabel}>Troops to deploy here:</span>
          <div className={style.DeployStepper}>
            <button
              type="button"
              className={style.DeployStepBtn}
              disabled={props.deployTroopCount! <= 1}
              onClick={() => props.onDeployTroopCountChange!(props.deployTroopCount! - 1)}
            >
              −
            </button>
            <input
              type="range"
              className={style.DeploySlider}
              style={{ background: sliderTrackFill(1, props.maxDeployTroops!, props.deployTroopCount!) }}
              min={1}
              max={props.maxDeployTroops}
              value={props.deployTroopCount}
              onChange={e => props.onDeployTroopCountChange!(Number(e.target.value))}
            />
            <span className={style.DeployCount}>{props.deployTroopCount}</span>
            <button
              type="button"
              className={style.DeployStepBtn}
              disabled={props.deployTroopCount! >= props.maxDeployTroops!}
              onClick={() => props.onDeployTroopCountChange!(props.deployTroopCount! + 1)}
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ActionMenu
