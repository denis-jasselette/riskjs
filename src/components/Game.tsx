import Map from '@/components/board/Map'
import style from '@/components/Game.module.scss'
import PlayerStatus from '@/components/playerStatus/PlayerStatus'

const Game = () => (
  <div className={style.Game}>
    <PlayerStatus />
    <Map class={style.GameMap} />
  </div>
)

export default Game
