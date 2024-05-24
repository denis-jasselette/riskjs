import ReactModal from 'react-modal'
import style from '@/components/menu/GameOver.module.scss'
import { useEffect } from 'preact/hooks'
import { createRef } from 'preact'
import SupportButton from '@/components/menu/SupportButton'

export type HandleStartParams = {
  playerCount: number
  blizzards: boolean
}

export type GameOverProps = {
  handleStart: (params: HandleStartParams) => void
}

export default (props: GameOverProps) => {
  const playerCountField = createRef()
  const blizzardsField = createRef()

  useEffect(() => {
    playerCountField.current!.focus()
  })

  const handleStart = () => {
    const params = {
      playerCount: parseInt(playerCountField.current.value),
      blizzards: blizzardsField.current.checked
    }
    props.handleStart(params)
  }

  return <>
    <ReactModal isOpen={true}
      className={style.Modal}
      overlayClassName={style.Overlay}>
      <header>
        <h1>Play Classic Risk</h1>
      </header>
      <form onSubmit={e => { e.preventDefault(); handleStart() }}>
        <main>
          <div class="form-group">
            <label class="form-label" for="players">Players</label>
            <input ref={playerCountField} id="players" type="number" min="2" max="6" value="6" />
          </div>
          <div class="form-group">
            <label class="form-label" for="card_bonus">Card bonus</label>
            <select id="card_bonus">
              <option selected>Fixed</option>
              <option>Progressive</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="bot_count">Bots</label>
            <input id="bot_count" type="number" min="0" max="4" value="0" />
          </div>
          <div class="form-group">
            <label class="form-label" for="bot_behavior">Bot behavior</label>
            <select id="bot_behavior">
              <option selected>Automated</option>
              <option>Neutral</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="bot_difficulty">Bot difficulty</label>
            <select id="bot_difficulty">
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
              <option>Expert</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="blizzards">Blizzards</label>
            <label class="switch">
              <input ref={blizzardsField} id="blizzards" type="checkbox" />
              <span class="slider round" />
            </label>
          </div>
          <div class="form-group">
            <label class="form-label" for="fog">Fog of war</label>
            <label class="switch">
              <input id="fog" type="checkbox" />
              <span class="slider round"></span>
            </label>
          </div>
        </main>

        <footer>
          <button type="submit">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" width="20"><path d="M274.9 34.3c-28.1-28.1-73.7-28.1-101.8 0L34.3 173.1c-28.1 28.1-28.1 73.7 0 101.8L173.1 413.7c28.1 28.1 73.7 28.1 101.8 0L413.7 274.9c28.1-28.1 28.1-73.7 0-101.8L274.9 34.3zM200 224a24 24 0 1 1 48 0 24 24 0 1 1 -48 0zM96 200a24 24 0 1 1 0 48 24 24 0 1 1 0-48zM224 376a24 24 0 1 1 0-48 24 24 0 1 1 0 48zM352 200a24 24 0 1 1 0 48 24 24 0 1 1 0-48zM224 120a24 24 0 1 1 0-48 24 24 0 1 1 0 48zm96 328c0 35.3 28.7 64 64 64H576c35.3 0 64-28.7 64-64V256c0-35.3-28.7-64-64-64H461.7c11.6 36 3.1 77-25.4 105.5L320 413.8V448zM480 328a24 24 0 1 1 0 48 24 24 0 1 1 0-48z" /></svg>
            &nbsp;
            Start game
          </button>
          <SupportButton />
        </footer>
      </form>
    </ReactModal>
  </>
}