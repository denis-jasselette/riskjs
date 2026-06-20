import { useEffect } from 'react'

import style from '@/components/DiceResult.module.scss'

export type DiceResultData = {
  attackerDice: number[]
  defenderDice: number[]
  attackerLosses: number
  defenderLosses: number
}

type DiceResultProps = {
  result: DiceResultData
  onDismiss: () => void
}

const DiceResult = ({ result, onDismiss }: DiceResultProps) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000)
    return () => clearTimeout(timer)
  }, [result])

  return (
    <div className={style.Overlay} onClick={onDismiss}>
      <div className={style.Panel} onClick={e => e.stopPropagation()}>
        <div className={style.DiceRow}>
          <div className={style.DiceGroup}>
            <span className={style.Label}>Attacker</span>
            <div className={style.Dice}>
              {result.attackerDice.map((value, i) => (
                <span key={i} className={`${style.Die} ${style.AttackerDie}`}>{value}</span>
              ))}
            </div>
          </div>
          <div className={style.DiceGroup}>
            <span className={style.Label}>Defender</span>
            <div className={style.Dice}>
              {result.defenderDice.map((value, i) => (
                <span key={i} className={`${style.Die} ${style.DefenderDie}`}>{value}</span>
              ))}
            </div>
          </div>
        </div>
        <div className={style.Losses}>
          <span className={style.AttackerLoss}>
            Attacker lost
            {' '}
            {result.attackerLosses}
          </span>
          <span className={style.DefenderLoss}>
            Defender lost
            {' '}
            {result.defenderLosses}
          </span>
        </div>
        <p className={style.Hint}>Click to dismiss</p>
      </div>
    </div>
  )
}

export default DiceResult
