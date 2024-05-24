import { useContext } from "preact/hooks"
import style from "./PlayerStatus.module.scss"
import GameContext from "../GameContext"
import PlayerInfo from "./PlayerInfo"
import PlayerConfig from "@/models/PlayerConfig"

export default () => {
  const { gameState } = useContext(GameContext)

  return <div class={style.PlayerStatusContainer}>
    {gameState.playerConfigs.map((playerConfig: PlayerConfig, playerId: number) =>
      <PlayerInfo key={playerId} playerConfig={playerConfig} />
    )}
  </div>
}