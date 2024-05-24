import Map from '@/components/board/Map'
import style from './Game.module.scss'
import PlayerStatus from './playerStatus/PlayerStatus'

export default () => <div class={style.Game}>
  <PlayerStatus />
  <Map class={style.GameMap} />
</div>