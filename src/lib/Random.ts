// Source: https://javascript.info/array-methods#shuffle-an-array
export function shuffle<T>(array: T[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); // random index from 0 to i

    // swap elements array[i] and array[j]
    // we use "destructuring assignment" syntax to achieve that
    // you'll find more details about that syntax in later chapters
    // same can be written as:
    // let t = array[i]; array[i] = array[j]; array[j] = t
    [array[i], array[j]] = [array[j], array[i]]
  }
}

export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function distribute(total: number, bucketCount: number): number[] {
  const buckets: number[] = new Array(bucketCount).fill(0)

  for (let i = 0; i < total; i++) {
    const randomBucket = randInt(0, bucketCount - 1)
    buckets[randomBucket]++
  }

  return buckets
}

export function diceRoll() {
  return randInt(1, 6)
}
