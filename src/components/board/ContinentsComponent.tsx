import { useContext } from 'preact/hooks'

import style from '@/components/board/Map.module.scss'
import GameContext from '@/components/GameContext'
import GameController from '@/controllers/GameController'

export const ContinentsComponent = () => {
  const { gameState } = useContext(GameContext)
  const gameController = new GameController(gameState)

  return (
    <>
      {Object.entries(gameState.mapConfig.continents).map(([name, continent]) =>
        <path key={name} className={style.ContinentEdge} d={continent.path} data-player={gameController.mapController.getContinentOwner(name)} />,
      )}
    </>
  )
}
