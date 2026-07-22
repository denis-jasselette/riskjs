import { useEffect } from 'react'

import style from '@/components/TurnChangeBanner.module.scss'

export type TurnChangeBannerData = {
  playerName: string
}

type TurnChangeBannerProps = {
  notice: TurnChangeBannerData
  onDismiss: () => void
}

const TurnChangeBanner = ({ notice, onDismiss }: TurnChangeBannerProps) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 2500)
    return () => clearTimeout(timer)
  }, [notice])

  return (
    <div className={style.Banner}>
      <span className={style.Text}>
        It&apos;s
        {' '}
        <span className={style.PlayerName}>{notice.playerName}</span>
        &apos;s turn
      </span>
    </div>
  )
}

export default TurnChangeBanner
