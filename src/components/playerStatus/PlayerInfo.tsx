import { useContext } from 'preact/hooks'

import Avatar from '@/components/Avatar'
import GameContext from '@/components/GameContext'
import style from '@/components/playerStatus/PlayerInfo.module.scss'
import GameController from '@/controllers/GameController'
import PlayerConfig from '@/models/PlayerConfig'

export interface PlayerInfoProps {
  playerConfig: PlayerConfig
}

const PlayerInfo = (props: PlayerInfoProps) => {
  const { gameState } = useContext(GameContext)
  const gameController = new GameController(gameState)

  return (
    <div
      className={style.PlayerInfo}
      data-is-current-player={gameState.currentPlayer === props.playerConfig.color}
      data-is-user-player={gameState.userPlayer === props.playerConfig.color}
      data-has-player-lost={gameController.hasPlayerLost(props.playerConfig.color)}
      data-player={props.playerConfig.color}
      data-human-player={props.playerConfig.human}
    >
      <div className={style.PlayerInfoAvatar}>
        <Avatar
          player={props.playerConfig.color}
          isHumanPlayer={props.playerConfig.human}
          hasPlayerLost={gameController.hasPlayerLost(props.playerConfig.color)}
        />
        {gameState.userPlayer === props.playerConfig.color
        && <div className={style.PlayerInfoUser}>You</div>}
      </div>

      <div className={style.PlayerInfoStats}>
        <div className={style.PlayerInfoTroops}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M256 0c4.6 0 9.2 1 13.4 2.9L457.7 82.8c22 9.3 38.4 31 38.3 57.2c-.5 99.2-41.3 280.7-213.6 363.2c-16.7 8-36.1 8-52.8 0C57.3 420.7 16.5 239.2 16 140c-.1-26.2 16.3-47.9 38.3-57.2L242.7 2.9C246.8 1 251.4 0 256 0z" /></svg>
          {gameController.getPlayerTroopTotal(props.playerConfig.color)}
        </div>
        <div className={style.PlayerInfoTerritories}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M57.7 193l9.4 16.4c8.3 14.5 21.9 25.2 38 29.8L163 255.7c17.2 4.9 29 20.6 29 38.5v39.9c0 11 6.2 21 16 25.9s16 14.9 16 25.9v39c0 15.6 14.9 26.9 29.9 22.6c16.1-4.6 28.6-17.5 32.7-33.8l2.8-11.2c4.2-16.9 15.2-31.4 30.3-40l8.1-4.6c15-8.5 24.2-24.5 24.2-41.7v-8.3c0-12.7-5.1-24.9-14.1-33.9l-3.9-3.9c-9-9-21.2-14.1-33.9-14.1H257c-11.1 0-22.1-2.9-31.8-8.4l-34.5-19.7c-4.3-2.5-7.6-6.5-9.2-11.2c-3.2-9.6 1.1-20 10.2-24.5l5.9-3c6.6-3.3 14.3-3.9 21.3-1.5l23.2 7.7c8.2 2.7 17.2-.4 21.9-7.5c4.7-7 4.2-16.3-1.2-22.8l-13.6-16.3c-10-12-9.9-29.5 .3-41.3l15.7-18.3c8.8-10.3 10.2-25 3.5-36.7l-2.4-4.2c-3.5-.2-6.9-.3-10.4-.3C163.1 48 84.4 108.9 57.7 193zM464 256c0-36.8-9.6-71.4-26.4-101.5L412 164.8c-15.7 6.3-23.8 23.8-18.5 39.8l16.9 50.7c3.5 10.4 12 18.3 22.6 20.9l29.1 7.3c1.2-9 1.8-18.2 1.8-27.5zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256z" /></svg>
          {gameController.getPlayerTerritoryTotal(props.playerConfig.color)}
        </div>
        <div className={style.PlayerInfoCards}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H288V368c0-26.5 21.5-48 48-48H448V96c0-35.3-28.7-64-64-64H64zM448 352H402.7 336c-8.8 0-16 7.2-16 16v66.7V480l32-32 64-64 32-32z" /></svg>
          {gameController.getPlayerCardTotal(props.playerConfig.color)}
        </div>
      </div>
    </div>
  )
}

export default PlayerInfo
