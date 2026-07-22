import style from '@/components/lobby/OnlineLobby.module.scss'
import { RoomSettings, Seat } from '@/net/protocol/lobby'

export type RoomLobbyProps = {
  code: string
  seats: Seat[]
  settings: RoomSettings
  hostSeatIndex: number
  seatIndex: number
  error: string | null
  onUpdateSettings: (settings: RoomSettings) => void
  onStart: () => void
  onLeave: () => void
}

const RoomLobby = (props: RoomLobbyProps) => {
  const isHost = props.seatIndex === props.hostSeatIndex

  const updateSetting = <K extends keyof RoomSettings>(key: K, value: RoomSettings[K]) => {
    props.onUpdateSettings({ ...props.settings, [key]: value })
  }

  return (
    <>
      <header>
        <h1>Room lobby</h1>
      </header>
      <main>
        <p className={style.RoomCode}>{props.code}</p>

        <div className={style.SeatList}>
          {props.seats.map(seat => (
            <div key={seat.index} className={style.Seat} data-open={seat.nickname === null}>
              <span>{seat.nickname ?? 'Open seat'}</span>
              <span>
                {seat.isHost && 'Host · '}
                {seat.connected ? 'Connected' : seat.nickname ? 'Disconnected' : ''}
              </span>
            </div>
          ))}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="seatCount">Seats</label>
          <input
            id="seatCount"
            type="number"
            min="2"
            max="6"
            value={props.settings.seatCount}
            disabled={!isHost}
            onChange={e => updateSetting('seatCount', parseInt(e.currentTarget.value))}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="blizzards">Blizzards</label>
          <label className="switch">
            <input
              id="blizzards"
              type="checkbox"
              checked={props.settings.blizzards}
              disabled={!isHost}
              onChange={e => updateSetting('blizzards', e.currentTarget.checked)}
            />
            <span className="slider round" />
          </label>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="fog">Fog of war</label>
          <label className="switch">
            <input
              id="fog"
              type="checkbox"
              checked={props.settings.fog}
              disabled={!isHost}
              onChange={e => updateSetting('fog', e.currentTarget.checked)}
            />
            <span className="slider round" />
          </label>
        </div>

        {props.error && <p className={style.ErrorText}>{props.error}</p>}
      </main>
      <footer>
        {isHost && <button type="button" onClick={props.onStart}>Start game</button>}
        {!isHost && <p>Waiting for the host to start the game…</p>}
        <button type="button" className="btn" onClick={props.onLeave}>Leave room</button>
      </footer>
    </>
  )
}

export default RoomLobby
