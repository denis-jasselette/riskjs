import { useCallback, useEffect, useRef, useState } from 'react'

import GameState from '@/models/GameState'
import { LobbySocket } from '@/net/LobbySocket'
import { RoomSettings, Seat, ServerMessage, StartedSeat } from '@/net/protocol/lobby'

const STORAGE_KEY = 'riskjs:onlineSession'

type StoredSession = { code: string, token: string }

type LobbyStatus = 'idle' | 'connecting' | 'lobby' | 'started' | 'error'

type LobbyState = {
  status: LobbyStatus
  code: string | null
  seatIndex: number | null
  seats: Seat[]
  settings: RoomSettings | null
  hostSeatIndex: number | null
  error: string | null
  started: { seats: StartedSeat[], settings: RoomSettings, gameState: GameState } | null
}

const initialState: LobbyState = {
  status: 'idle',
  code: null,
  seatIndex: null,
  seats: [],
  settings: null,
  hostSeatIndex: null,
  error: null,
  started: null,
}

function readStoredSession(): StoredSession | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredSession
  }
  catch {
    return null
  }
}

function writeStoredSession(session: StoredSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearStoredSession(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function useLobbySession() {
  const socketRef = useRef<LobbySocket | null>(null)
  const [state, setState] = useState<LobbyState>(initialState)

  const getSocket = useCallback(() => {
    if (!socketRef.current) socketRef.current = new LobbySocket()
    return socketRef.current
  }, [])

  useEffect(() => {
    const socket = getSocket()
    return socket.onMessage((message: ServerMessage) => {
      switch (message.type) {
        case 'joined':
          writeStoredSession({ code: message.payload.code, token: message.payload.token })
          setState(s => ({
            ...s,
            status: 'lobby',
            code: message.payload.code,
            seatIndex: message.payload.seatIndex,
            seats: message.payload.seats,
            settings: message.payload.settings,
            hostSeatIndex: message.payload.hostSeatIndex,
            error: null,
          }))
          return
        case 'lobby_state':
          setState(s => ({
            ...s,
            seats: message.payload.seats,
            settings: message.payload.settings,
            hostSeatIndex: message.payload.hostSeatIndex,
          }))
          return
        case 'game_started':
          setState(s => ({ ...s, status: 'started', started: message.payload }))
          return
        case 'room_closed':
          clearStoredSession()
          setState({ ...initialState, status: 'error', error: message.payload.reason })
          return
        case 'error':
          setState(s => ({ ...s, status: s.status === 'idle' || s.status === 'connecting' ? 'error' : s.status, error: message.payload.message }))
          return
      }
    })
  }, [getSocket])

  useEffect(() => {
    const stored = readStoredSession()
    if (!stored) return
    const socket = getSocket();
    (async () => {
      setState(s => ({ ...s, status: 'connecting' }))
      try {
        await socket.connect()
        socket.send({ type: 'reconnect', payload: { token: stored.token } })
      }
      catch {
        setState(s => ({ ...s, status: 'error', error: 'Could not reach the lobby server.' }))
      }
    })()
  }, [getSocket])

  const createRoom = useCallback(async (nickname: string, settings: RoomSettings) => {
    const socket = getSocket()
    setState(s => ({ ...s, status: 'connecting', error: null }))
    try {
      await socket.connect()
      socket.send({ type: 'create_room', payload: { nickname, settings } })
    }
    catch {
      setState(s => ({ ...s, status: 'error', error: 'Could not reach the lobby server.' }))
    }
  }, [getSocket])

  const joinRoom = useCallback(async (code: string, nickname: string) => {
    const socket = getSocket()
    setState(s => ({ ...s, status: 'connecting', error: null }))
    try {
      await socket.connect()
      socket.send({ type: 'join_room', payload: { code: code.toUpperCase(), nickname } })
    }
    catch {
      setState(s => ({ ...s, status: 'error', error: 'Could not reach the lobby server.' }))
    }
  }, [getSocket])

  const updateSettings = useCallback((settings: RoomSettings) => {
    getSocket().send({ type: 'update_settings', payload: { settings } })
  }, [getSocket])

  const startGame = useCallback(() => {
    getSocket().send({ type: 'start_game', payload: {} })
  }, [getSocket])

  const endGame = useCallback(() => {
    getSocket().send({ type: 'end_game', payload: {} })
  }, [getSocket])

  const leave = useCallback(() => {
    getSocket().send({ type: 'leave_room', payload: {} })
    clearStoredSession()
    // Close (not discard) the socket wrapper — its message listener was registered once,
    // on this instance, in the effect above. LobbySocket.connect() creates a fresh
    // underlying WebSocket as long as the wrapper itself survives a close().
    socketRef.current?.close()
    setState(initialState)
  }, [getSocket])

  return { state, createRoom, joinRoom, updateSettings, startGame, endGame, leave }
}
