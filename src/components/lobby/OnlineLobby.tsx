import { useEffect, useRef, useState } from 'react'

import CreateRoomForm from '@/components/lobby/CreateRoomForm'
import JoinRoomForm from '@/components/lobby/JoinRoomForm'
import LobbyChooser from '@/components/lobby/LobbyChooser'
import style from '@/components/lobby/OnlineLobby.module.scss'
import RoomLobby from '@/components/lobby/RoomLobby'
import { useLobbySession } from '@/hooks/useLobbySession'
import GameState from '@/models/GameState'

export type OnlineLobbyProps = {
  onGameStarted: (gameState: GameState) => void
  onExit: () => void
}

type Screen = 'choose' | 'create' | 'join'

const OnlineLobby = (props: OnlineLobbyProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [screen, setScreen] = useState<Screen>('choose')
  const { state, createRoom, joinRoom, updateSettings, startGame, endGame, leave } = useLobbySession()

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  useEffect(() => {
    if (state.status === 'error') setScreen('choose')
  }, [state.status])

  const handleLeave = () => {
    leave()
    props.onExit()
  }

  const handleViewBoard = () => {
    if (!state.started) return
    const mySeat = state.started.seats.find(seat => seat.index === state.seatIndex)
    props.onGameStarted({ ...state.started.gameState, userPlayer: mySeat?.color ?? state.started.gameState.userPlayer })
  }

  const pending = state.status === 'connecting'

  return (
    <dialog ref={dialogRef} className={style.Modal}>
      {state.status === 'started' && state.started && (
        <>
          <header>
            <h1>Game started!</h1>
          </header>
          <main>
            <div className={style.SeatList}>
              {state.started.seats.map(seat => (
                <div key={seat.index} className={style.Seat} data-open={seat.nickname === null}>
                  <span>{seat.nickname ?? 'Open seat'}</span>
                  <span>{seat.color}</span>
                </div>
              ))}
            </div>
            <p className={style.Intro}>
              Live turn syncing across players isn&rsquo;t wired up yet — this shows the starting board so you can confirm
              the room handoff worked.
            </p>
          </main>
          <footer>
            <button type="button" onClick={handleViewBoard}>View board (preview)</button>
            {state.seatIndex === state.hostSeatIndex && (
              <button type="button" className="btn" onClick={endGame}>Kill game</button>
            )}
          </footer>
        </>
      )}

      {state.status === 'lobby' && state.code && state.settings && state.seatIndex !== null && state.hostSeatIndex !== null && (
        <RoomLobby
          code={state.code}
          seats={state.seats}
          settings={state.settings}
          hostSeatIndex={state.hostSeatIndex}
          seatIndex={state.seatIndex}
          error={state.error}
          onUpdateSettings={updateSettings}
          onStart={startGame}
          onLeave={handleLeave}
        />
      )}

      {state.status !== 'started' && state.status !== 'lobby' && screen === 'create' && (
        <CreateRoomForm pending={pending} error={state.error} onCreate={createRoom} onBack={() => setScreen('choose')} />
      )}
      {state.status !== 'started' && state.status !== 'lobby' && screen === 'join' && (
        <JoinRoomForm pending={pending} error={state.error} onJoin={joinRoom} onBack={() => setScreen('choose')} />
      )}
      {state.status !== 'started' && state.status !== 'lobby' && screen === 'choose' && (
        <LobbyChooser error={state.error} onCreate={() => setScreen('create')} onJoin={() => setScreen('join')} onCancel={props.onExit} />
      )}
    </dialog>
  )
}

export default OnlineLobby
