import { useRef } from 'react'

import { RoomSettings } from '@/net/protocol/lobby'

export type CreateRoomFormProps = {
  pending: boolean
  error: string | null
  onCreate: (nickname: string, settings: RoomSettings) => void
  onBack: () => void
}

const CreateRoomForm = (props: CreateRoomFormProps) => {
  const nicknameField = useRef<HTMLInputElement>(null)
  const seatCountField = useRef<HTMLInputElement>(null)
  const blizzardsField = useRef<HTMLInputElement>(null)
  const fogField = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    props.onCreate(nicknameField.current!.value, {
      seatCount: parseInt(seatCountField.current!.value),
      blizzards: blizzardsField.current!.checked,
      fog: fogField.current!.checked,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <header>
        <h1>Create a room</h1>
      </header>
      <main>
        <div className="form-group">
          <label className="form-label" htmlFor="nickname">Your name</label>
          <input ref={nicknameField} id="nickname" type="text" maxLength={20} required autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="seatCount">Seats</label>
          <input ref={seatCountField} id="seatCount" type="number" min="2" max="6" defaultValue="6" />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="blizzards">Blizzards</label>
          <label className="switch">
            <input ref={blizzardsField} id="blizzards" type="checkbox" />
            <span className="slider round" />
          </label>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="fog">Fog of war</label>
          <label className="switch">
            <input ref={fogField} id="fog" type="checkbox" />
            <span className="slider round" />
          </label>
        </div>
      </main>
      <footer>
        {props.error && <p>{props.error}</p>}
        <button type="submit" disabled={props.pending}>Create room</button>
        <button type="button" className="btn" onClick={props.onBack}>Back</button>
      </footer>
    </form>
  )
}

export default CreateRoomForm
