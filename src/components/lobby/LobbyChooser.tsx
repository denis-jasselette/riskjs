import style from '@/components/lobby/OnlineLobby.module.scss'

export type LobbyChooserProps = {
  error: string | null
  onCreate: () => void
  onJoin: () => void
  onCancel: () => void
}

const LobbyChooser = (props: LobbyChooserProps) => {
  return (
    <>
      <header>
        <h1>Play online</h1>
      </header>
      <main>
        <p className={style.Intro}>Create a room and share the code with friends, or join one you&rsquo;ve been invited to.</p>
        {props.error && <p className={style.ErrorText}>{props.error}</p>}
      </main>
      <footer>
        <button type="button" onClick={props.onCreate}>Create a room</button>
        <button type="button" onClick={props.onJoin}>Join a room</button>
        <button type="button" className="btn" onClick={props.onCancel}>Back to local play</button>
      </footer>
    </>
  )
}

export default LobbyChooser
