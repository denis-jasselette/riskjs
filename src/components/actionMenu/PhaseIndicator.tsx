import { GamePhase } from '@/models/GamePhase'
import style from './ActionMenu.module.scss'
import classnames from 'classnames'

export interface PhaseIndicatorProps {
  currentPhase: GamePhase,
  troopsToDeploy: number,
}

export const PhaseIndicator = (props: PhaseIndicatorProps) => {
  const phases = [
    { phase: 'deploy', label: `Deploy ${props.troopsToDeploy} troops` },
    { phase: 'attack', label: 'Attack' },
    { phase: 'fortify', label: 'Fortify' },
  ]

  return (
    <div class={style.PhaseIndicator}>
      {phases.map(x =>
        <div class={classnames(style.PhaseIndicatorPhase, { [`${style.PhaseIndicatorPhaseActive}`]: x.phase === props.currentPhase })} key={x.phase}>
          {x.label}
        </div>
      )}
    </div>
  )
}
