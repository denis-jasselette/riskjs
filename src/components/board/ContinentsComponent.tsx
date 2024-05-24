import style from './Map.module.scss'
import GameController from '@/controllers/GameController';
import GameContext from '@/components/GameContext';
import { useContext } from 'preact/hooks';

export const ContinentsComponent = () => {
  const { gameState, setGameState } = useContext(GameContext)
  const gameController = new GameController(gameState)

  return <>
    {Object.entries(gameState.mapConfig.continents).map(([name, continent]) =>
      <path key={name} class={style.ContinentEdge} d={continent.path} data-player={gameController.getContinentOwner(name)} />
    )}
  </>;
};
