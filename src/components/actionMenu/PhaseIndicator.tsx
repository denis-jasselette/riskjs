import classnames from 'classnames'

import style from '@/components/actionMenu/ActionMenu.module.scss'
import { GamePhase } from '@/models/GamePhase'

export interface PhaseIndicatorProps {
  currentPhase: GamePhase
  troopsToDeploy: number
}

export const PhaseIndicator = (props: PhaseIndicatorProps) => {
  const phases = [
    { phase: 'deploy', label: `Deploy ${props.troopsToDeploy} troops` },
    { phase: 'attack', label: 'Attack' },
    { phase: 'fortify', label: 'Fortify' },
  ]

  return (
    <div className={style.PhaseIndicator}>
      {phases.map(x => (
        <div className={classnames(style.PhaseIndicatorPhase, { [`${style.PhaseIndicatorPhaseActive}`]: x.phase === props.currentPhase })} key={x.phase}>
          {x.label}
        </div>
      ),
      )}
    </div>
  )
}
