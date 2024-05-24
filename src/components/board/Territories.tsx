import GameController from '@/controllers/GameController';
import { useContext } from 'preact/hooks';
import GameContext from '@/components/GameContext';
import Territory from './Territory';
import TerritoryConfig from '@/models/TerritoryConfig';

export interface TerritoriesComponentProps {
  selectedTerritory?: string
  handleClick?: (territory: string) => void
}

export default (props: TerritoriesComponentProps) => {
  const { gameState } = useContext(GameContext)
  const gameController = new GameController(gameState)

  const compareFn = (a: string, b: string): number => {
    if (a === props.selectedTerritory)
      return 1
    if (b === props.selectedTerritory)
      return -1
    return a.localeCompare(b)
  }

  const entries = Object.entries(gameState.mapConfig.territories)
    .sort((a: [string, TerritoryConfig], b: [string, TerritoryConfig]) => compareFn(a[0], b[0]))

  return <>
    {entries.map(([territory, territoryConfig]) => {
      const troopState = gameController.getTroopState(territory)
      const isBlizzard = gameController.isTerritoryBlizzard(territory)
      const isSelected = territory === props.selectedTerritory
      return <Territory
        key={territory}
        territory={territory}
        territoryConfig={territoryConfig}
        troopSize={gameState.mapConfig.troopSize}
        owner={gameController.getTerritoryOwner(territory)}
        troopState={troopState}
        isBlizzard={isBlizzard}
        isSelected={isSelected}
        isSelectable={gameController.isSelectable(territory)}
        handleClick={props.handleClick} />
    })}
  </>;
};
