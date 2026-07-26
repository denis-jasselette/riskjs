import { useContext } from 'react'

import GameContext from '@/components/GameContext'
import GameController from '@/controllers/GameController'
import { GamePhase } from '@/models/GamePhase'

export interface PhaseEndButtonProps {
  currentPhase: GamePhase
  handleClick: () => void
}

const PhaseEndButton = (props: PhaseEndButtonProps) => {
  const { gameState, viewingPlayer } = useContext(GameContext)

  if (viewingPlayer !== gameState.currentPlayer)
    return (
      <button disabled={true}>
        Opponent&apos;s turn
      </button>
    )

  // A post-conquest troop-movement choice blocks every other action,
  // including ending the phase, until it is resolved (FR-007) -- modeled
  // directly on the forced-trade-in disabled branch below.
  if (gameState.pendingPostConquestMove)
    return (
      <button disabled={true}>
        Choose troops to move
      </button>
    )

  if (gameState.currentPhase === 'deploy') {
    if (gameState.troopsToDeploy > 0)
      return (
        <button disabled={true}>
          Deploy your troops
        </button>
      )

    const gameController = new GameController(gameState)
    if (gameController.hasForcedTradeIn())
      return (
        <button disabled={true}>
          Trade-in required
        </button>
      )

    return (
      <button onClick={props.handleClick}>
        Continue to Attack
      </button>
    )
  }

  if (gameState.currentPhase === 'attack')
    return (
      <button onClick={props.handleClick}>
        End attack phase
      </button>
    )

  if (gameState.currentPhase === 'fortify')
    return (
      <button onClick={props.handleClick}>
        End turn
      </button>
    )

  return <></>
}

export default PhaseEndButton
