import { useContext } from 'react'

import style from '@/components/capitalCounter/CapitalCounter.module.scss'
import GameContext from '@/components/GameContext'
import GameController from '@/controllers/GameController'

// Global, display-only badge for Capital Mode games (feature 012). Shows a
// round counter for the first three rounds following capital placement, then
// permanently switches to an anonymized "Leader: N/total" indicator — the
// highest number of capitals currently owned by any one player, never which
// player holds it (FR-005). Renders nothing outside capital-mode games
// (FR-007). Pure derivation from GameState on every render — never cached —
// so it can never go stale (SC-003).
const CapitalCounter = () => {
  const { gameState } = useContext(GameContext)

  if (!gameState.capitalMode)
    return null

  if (gameState.roundsSincePlacement < 3) {
    return (
      <div className={style.CapitalCounter}>
        {`Round: ${gameState.roundsSincePlacement + 1}`}
      </div>
    )
  }

  const gameController = new GameController(gameState)
  const leader = Math.max(...gameState.playerConfigs.map(p => gameController.mapController.getPlayerCapitalCount(p.color)))
  const total = gameState.playerConfigs.length

  return (
    <div className={style.CapitalCounter}>
      {`Leader: ${leader}/${total}`}
    </div>
  )
}

export default CapitalCounter
