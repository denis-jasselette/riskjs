import { useRef } from 'react'

export type JoinRoomFormProps = {
  pending: boolean
  error: string | null
  onJoin: (code: string, nickname: string) => void
  onBack: () => void
}

const JoinRoomForm = (props: JoinRoomFormProps) => {
  const codeField = useRef<HTMLInputElement>(null)
  const nicknameField = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    props.onJoin(codeField.current!.value, nicknameField.current!.value)
  }

  return (
    <form onSubmit={handleSubmit}>
      <header>
        <h1>Join a room</h1>
      </header>
      <main>
        <div className="form-group">
          <label className="form-label" htmlFor="code">Room code</label>
          <input ref={codeField} id="code" type="text" maxLength={4} required autoFocus style={{ textTransform: 'uppercase' }} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="nickname">Your name</label>
          <input ref={nicknameField} id="nickname" type="text" maxLength={20} required />
        </div>
      </main>
      <footer>
        {props.error && <p>{props.error}</p>}
        <button type="submit" disabled={props.pending}>Join room</button>
        <button type="button" className="btn" onClick={props.onBack}>Back</button>
      </footer>
    </form>
  )
}

export default JoinRoomForm
