import { useCallback, useEffect, useRef, useState } from 'react'

export interface PanZoomTransform {
  x: number
  y: number
  scale: number
}

export interface PanZoomHandlers {
  onPointerDown: (e: PointerEvent) => void
  onPointerMove: (e: PointerEvent) => void
  onPointerUp: (e: PointerEvent) => void
  onPointerCancel: (e: PointerEvent) => void
}

const DEFAULT_TRANSFORM: PanZoomTransform = { x: 0, y: 0, scale: 1 }

const MIN_SCALE = 1
const MAX_SCALE = 5
const DOUBLE_TAP_MS = 300
const DOUBLE_TAP_ZOOM = 2.5
const TAP_MOVE_THRESHOLD = 5

function getDistance(p1: PointerEvent, p2: PointerEvent): number {
  const dx = p1.clientX - p2.clientX
  const dy = p1.clientY - p2.clientY
  return Math.sqrt(dx * dx + dy * dy)
}

function getMidpoint(p1: PointerEvent, p2: PointerEvent): { x: number, y: number } {
  return {
    x: (p1.clientX + p2.clientX) / 2,
    y: (p1.clientY + p2.clientY) / 2,
  }
}

/**
 * Clamps pan so the SVG content doesn't drift entirely off-screen.
 * svgW/svgH are the SVG's natural (viewBox) dimensions in client pixels,
 * approximated by the element's bounding rect at scale 1.
 */
function clampTransform(
  x: number,
  y: number,
  scale: number,
  containerW: number,
  containerH: number,
): PanZoomTransform {
  if (scale <= 1) {
    return { x: 0, y: 0, scale }
  }
  const extraW = containerW * (scale - 1)
  const extraH = containerH * (scale - 1)
  const clampedX = Math.min(0, Math.max(-extraW, x))
  const clampedY = Math.min(0, Math.max(-extraH, y))
  return { x: clampedX, y: clampedY, scale }
}

export interface UsePanZoomOptions {
  /** When this value changes the transform is reset to identity */
  resetKey?: unknown
  /** Ref to the SVG container element, used for coordinate calculations */
  svgRef: { current: SVGSVGElement | null }
}

export interface UsePanZoomResult {
  transform: PanZoomTransform
  handlers: PanZoomHandlers
  resetTransform: () => void
}

export function usePanZoom({ resetKey, svgRef }: UsePanZoomOptions): UsePanZoomResult {
  const [transform, setTransform] = useState<PanZoomTransform>(DEFAULT_TRANSFORM)

  // Active pointers map: pointerId -> PointerEvent
  const activePointers = useRef<Map<number, PointerEvent>>(new Map())
  // State at gesture start
  const gestureStart = useRef<{
    distance: number
    scale: number
    midX: number
    midY: number
    panX: number
    panY: number
  } | null>(null)

  // Drag state for single-pointer pan
  const dragStart = useRef<{
    clientX: number
    clientY: number
    panX: number
    panY: number
  } | null>(null)

  // Double-tap detection
  const lastTapTime = useRef<number>(0)
  const lastTapPos = useRef<{ x: number, y: number } | null>(null)

  // Track total movement to distinguish tap from drag
  const pointerMoveTotal = useRef<number>(0)
  const pointerStartPos = useRef<{ x: number, y: number } | null>(null)

  const currentTransform = useRef<PanZoomTransform>(DEFAULT_TRANSFORM)
  currentTransform.current = transform

  const resetTransform = useCallback(() => {
    setTransform(DEFAULT_TRANSFORM)
  }, [])

  // Reset transform when resetKey changes
  useEffect(() => {
    resetTransform()
  }, [resetKey])

  const getContainerSize = useCallback((): { w: number, h: number } => {
    const el = svgRef.current
    if (!el) return { w: 1, h: 1 }
    const rect = el.getBoundingClientRect()
    return { w: rect.width, h: rect.height }
  }, [svgRef])

  /**
   * Convert a client-space coordinate to SVG viewBox space, ignoring our
   * pan/zoom transform (used to compute the zoom pivot).
   */
  const clientToSvgViewBox = useCallback(
    (clientX: number, clientY: number): { x: number, y: number } => {
      const el = svgRef.current
      if (!el) return { x: clientX, y: clientY }
      const rect = el.getBoundingClientRect()
      const vb = el.viewBox.baseVal
      const rx = (clientX - rect.left) / rect.width
      const ry = (clientY - rect.top) / rect.height
      return { x: rx * vb.width, y: ry * vb.height }
    },
    [svgRef],
  )

  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      activePointers.current.set(e.pointerId, e)
      const pointers = Array.from(activePointers.current.values())

      if (pointers.length === 2) {
        // Start pinch gesture – cancel any single-pointer drag
        dragStart.current = null
        pointerStartPos.current = null
        const [p1, p2] = pointers
        const dist = getDistance(p1, p2)
        const mid = getMidpoint(p1, p2)
        const t = currentTransform.current
        gestureStart.current = {
          distance: dist,
          scale: t.scale,
          midX: mid.x,
          midY: mid.y,
          panX: t.x,
          panY: t.y,
        }
      }
      else if (pointers.length === 1) {
        gestureStart.current = null
        dragStart.current = {
          clientX: e.clientX,
          clientY: e.clientY,
          panX: currentTransform.current.x,
          panY: currentTransform.current.y,
        }
        pointerMoveTotal.current = 0
        pointerStartPos.current = { x: e.clientX, y: e.clientY }
      }
    },
    [],
  )

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!activePointers.current.has(e.pointerId)) return
      activePointers.current.set(e.pointerId, e)
      const pointers = Array.from(activePointers.current.values())

      if (pointers.length === 2 && gestureStart.current) {
        const [p1, p2] = pointers
        const dist = getDistance(p1, p2)
        const mid = getMidpoint(p1, p2)
        const { distance, scale: startScale, midX, midY, panX, panY } = gestureStart.current
        const { w, h } = getContainerSize()

        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, startScale * (dist / distance)))

        // Zoom towards the pinch midpoint in SVG client space
        const svgPt = clientToSvgViewBox(midX, midY)
        // Midpoint shifted by delta pan during gesture
        const deltaMidX = mid.x - midX
        const deltaMidY = mid.y - midY

        // Scale around the initial midpoint in viewBox units:
        // new_pan = initial_pan + (svgPt * (initialScale - newScale)) + deltaMid * (newScale / containerFactor)
        // Simpler approach: derive from the constraint that svgPt stays under finger
        const vb = svgRef.current?.viewBox.baseVal
        const scaleX = vb ? w / vb.width : 1
        const scaleY = vb ? h / vb.height : 1
        const avgScale = (scaleX + scaleY) / 2

        const newX = panX + svgPt.x * avgScale * (startScale - newScale) / startScale + deltaMidX
        const newY = panY + svgPt.y * avgScale * (startScale - newScale) / startScale + deltaMidY

        setTransform(clampTransform(newX, newY, newScale, w, h))
      }
      else if (pointers.length === 1 && dragStart.current) {
        const dx = e.clientX - dragStart.current.clientX
        const dy = e.clientY - dragStart.current.clientY

        // Track total movement for tap detection
        if (pointerStartPos.current) {
          const totalDx = e.clientX - pointerStartPos.current.x
          const totalDy = e.clientY - pointerStartPos.current.y
          pointerMoveTotal.current = Math.sqrt(totalDx * totalDx + totalDy * totalDy)
        }

        const t = currentTransform.current
        if (t.scale <= 1) return // don't pan when not zoomed in

        const { w, h } = getContainerSize()
        const newX = dragStart.current.panX + dx
        const newY = dragStart.current.panY + dy
        setTransform(clampTransform(newX, newY, t.scale, w, h))
      }
    },
    [getContainerSize, clientToSvgViewBox, svgRef],
  )

  const onPointerUp = useCallback(
    (e: PointerEvent) => {
      const wasSinglePointer = activePointers.current.size === 1
      activePointers.current.delete(e.pointerId)
      const remaining = activePointers.current.size

      if (remaining === 0) {
        gestureStart.current = null

        // Double-tap detection
        if (wasSinglePointer && pointerMoveTotal.current < TAP_MOVE_THRESHOLD) {
          const now = Date.now()
          const dt = now - lastTapTime.current
          if (dt < DOUBLE_TAP_MS && lastTapPos.current) {
            // Double tap detected – zoom in or reset
            const t = currentTransform.current
            if (t.scale > 1) {
              setTransform(DEFAULT_TRANSFORM)
            }
            else {
              const { w, h } = getContainerSize()
              const svgPt = clientToSvgViewBox(e.clientX, e.clientY)
              const vb = svgRef.current?.viewBox.baseVal
              const scaleX = vb ? w / vb.width : 1
              const scaleY = vb ? h / vb.height : 1
              const avgScale = (scaleX + scaleY) / 2
              const newScale = DOUBLE_TAP_ZOOM
              const newX = -svgPt.x * avgScale * (newScale - 1)
              const newY = -svgPt.y * avgScale * (newScale - 1)
              setTransform(clampTransform(newX, newY, newScale, w, h))
            }
            lastTapTime.current = 0
            lastTapPos.current = null
          }
          else {
            lastTapTime.current = now
            lastTapPos.current = { x: e.clientX, y: e.clientY }
          }
        }

        dragStart.current = null
        pointerStartPos.current = null
      }
      else if (remaining === 1) {
        // One finger lifted from a pinch — restart single-pointer drag from current state
        gestureStart.current = null
        const [remaining0] = Array.from(activePointers.current.values())
        dragStart.current = {
          clientX: remaining0.clientX,
          clientY: remaining0.clientY,
          panX: currentTransform.current.x,
          panY: currentTransform.current.y,
        }
        pointerMoveTotal.current = 0
        pointerStartPos.current = { x: remaining0.clientX, y: remaining0.clientY }
      }
    },
    [getContainerSize, clientToSvgViewBox, svgRef],
  )

  const onPointerCancel = useCallback(
    (e: PointerEvent) => {
      activePointers.current.delete(e.pointerId)
      if (activePointers.current.size === 0) {
        gestureStart.current = null
        dragStart.current = null
        pointerStartPos.current = null
      }
    },
    [],
  )

  return {
    transform,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
    resetTransform,
  }
}

/**
 * Returns true when the last pointer-up indicates a tap (not a drag).
 * Call this in click handlers to guard against accidental drag-triggers.
 */
export function isTap(totalMovePx: number): boolean {
  return totalMovePx < TAP_MOVE_THRESHOLD
}
