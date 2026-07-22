import style from '@/components/EliminationBanner.module.scss'

export type EliminationBannerData = {
  playerName: string
}

type EliminationBannerProps = {
  notice: EliminationBannerData
  onDismiss: () => void
}

const EliminationBanner = ({ notice, onDismiss }: EliminationBannerProps) => {
  return (
    <div className={style.Overlay} onClick={onDismiss}>
      <div className={style.Banner} onClick={e => e.stopPropagation()}>
        <span className={style.Icon}>💀</span>
        <span className={style.Text}>
          <span className={style.PlayerName}>{notice.playerName}</span>
          {' '}
          has been eliminated!
        </span>
        <p className={style.Hint}>Click to dismiss</p>
      </div>
    </div>
  )
}

export default EliminationBanner
