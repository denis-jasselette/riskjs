import { useEffect, useRef } from 'react'

import style from '@/components/menu/GameOver.module.scss'
import SupportButton from '@/components/menu/SupportButton'

export type HandleStartParams = {
  playerCount: number
  blizzards: boolean
  fog: boolean
  capitalMode: boolean
}

export type GameOverProps = {
  handleStart: (params: HandleStartParams) => void
}

const GameOver = (props: GameOverProps) => {
  const playerCountField = useRef<HTMLInputElement>(null)
  const blizzardsField = useRef<HTMLInputElement>(null)
  const fogField = useRef<HTMLInputElement>(null)
  const capitalModeField = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    dialogRef.current?.showModal()
    playerCountField.current?.focus()
  }, [])

  const handleStart = () => {
    const params = {
      playerCount: parseInt(playerCountField.current!.value),
      blizzards: blizzardsField.current!.checked,
      fog: fogField.current!.checked,
      capitalMode: capitalModeField.current!.checked,
    }
    props.handleStart(params)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleStart()
  }

  return (
    <dialog ref={dialogRef} className={style.Modal}>
      <header>
        <h1>Play Classic Risk</h1>
      </header>
      <form onSubmit={handleSubmit}>
        <main>
          <div className="form-group">
            <label className="form-label" htmlFor="players">Players</label>
            <input ref={playerCountField} id="players" type="number" min="2" max="6" defaultValue="6" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="card_bonus">Card bonus</label>
            <select id="card_bonus">
              <option>Fixed</option>
              <option>Progressive</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="bot_count">Bots</label>
            <input id="bot_count" type="number" min="0" max="4" defaultValue="0" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="bot_behavior">Bot behavior</label>
            <select id="bot_behavior">
              <option>Automated</option>
              <option>Neutral</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="bot_difficulty">Bot difficulty</label>
            <select id="bot_difficulty">
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
              <option>Expert</option>
            </select>
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
              <span className="slider round"></span>
            </label>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="capital_mode">Capital mode</label>
            <label className="switch">
              <input ref={capitalModeField} id="capital_mode" type="checkbox" />
              <span className="slider round" />
            </label>
          </div>
        </main>

        <footer>
          <button type="submit">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" width="20" fill="currentColor"><path d="M274.9 34.3c-28.1-28.1-73.7-28.1-101.8 0L34.3 173.1c-28.1 28.1-28.1 73.7 0 101.8L173.1 413.7c28.1 28.1 73.7 28.1 101.8 0L413.7 274.9c28.1-28.1 28.1-73.7 0-101.8L274.9 34.3zM200 224a24 24 0 1 1 48 0 24 24 0 1 1 -48 0zM96 200a24 24 0 1 1 0 48 24 24 0 1 1 0-48zM224 376a24 24 0 1 1 0-48 24 24 0 1 1 0 48zM352 200a24 24 0 1 1 0 48 24 24 0 1 1 0-48zM224 120a24 24 0 1 1 0-48 24 24 0 1 1 0 48zm96 328c0 35.3 28.7 64 64 64H576c35.3 0 64-28.7 64-64V256c0-35.3-28.7-64-64-64H461.7c11.6 36 3.1 77-25.4 105.5L320 413.8V448zM480 328a24 24 0 1 1 0 48 24 24 0 1 1 0-48z" /></svg>
            &nbsp;
            Start game
          </button>
          <SupportButton />
        </footer>
      </form>
    </dialog>
  )
}

export default GameOver
