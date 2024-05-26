import { GamePhase } from '@/models/GamePhase'

export interface PhaseIndicatorProps {
  currentPhase: GamePhase
}

export const PhaseIndicator = (props: PhaseIndicatorProps) => {
  return (
    <>
      {props.currentPhase}
    </>
  )
}
