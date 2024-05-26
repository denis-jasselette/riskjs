import { useContext } from 'preact/hooks'

import GameContext from '@/components/GameContext'
import { GamePhase } from '@/models/GamePhase'

export interface PhaseEndButtonProps {
  currentPhase: GamePhase
  handleClick: () => void
}

const PhaseEndButton = (props: PhaseEndButtonProps) => {
  const { gameState } = useContext(GameContext)

  if (gameState.userPlayer !== gameState.currentPlayer)
    return (
      <button disabled={true}>
        Opponent&apos;s turn
      </button>
    )

  if (gameState.currentPhase === 'deploy')
    return (
      <button disabled={true}>
        Deploy all your troops
      </button>
    )

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
