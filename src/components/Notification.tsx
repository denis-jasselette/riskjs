import { useEffect, useState } from 'react'

import style from '@/components/Notification.module.scss'
import { PlayerColor } from '@/models/PlayerConfig'

export type NotificationType = 'turn' | 'elimination'

export interface NotificationData {
  message: string
  type: NotificationType
  playerColor: PlayerColor
}

export interface NotificationProps {
  notification: NotificationData
  onDismiss: () => void
}

const Notification = ({ notification, onDismiss }: NotificationProps) => {
  const [dismissing, setDismissing] = useState(false)

  const dismiss = () => {
    setDismissing(true)
    setTimeout(onDismiss, 280)
  }

  useEffect(() => {
    setDismissing(false)
    if (notification.type === 'turn') {
      const timer = setTimeout(dismiss, 2500)
      return () => clearTimeout(timer)
    }
  }, [notification])

  return (
    <div
      className={style.Notification}
      data-player={notification.playerColor}
      data-dismissing={dismissing}
    >
      <span className={style.NotificationAccent} />
      {notification.message}
      <button
        className={style.NotificationDismiss}
        onClick={dismiss}
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </div>
  )
}

export default Notification
