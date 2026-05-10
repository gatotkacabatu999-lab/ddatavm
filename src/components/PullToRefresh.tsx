import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react"
import { Loader2, RotateCw } from "lucide-react"
import { useRefresh } from "@/contexts/RefreshContext"

interface PullToRefreshProps {
  children: ReactNode
  className?: string
  /** Ref to the nav header element — it will translate together with content */
  headerRef?: RefObject<HTMLElement | null>
  /** Minimum pull distance (px) to trigger a refresh */
  threshold?: number
  /** Maximum pull distance (px) before resistance caps */
  maxPull?: number
}

const DEFAULT_THRESHOLD = 70
const DEFAULT_MAX_PULL = 110

export function PullToRefresh({
  children,
  className,
  headerRef,
  threshold = DEFAULT_THRESHOLD,
  maxPull = DEFAULT_MAX_PULL,
}: PullToRefreshProps) {
  const { trigger, isRefreshing } = useRefresh()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const indicatorRef = useRef<HTMLDivElement | null>(null)

  // Track pull state via refs only — no setState during gesture for smooth 60fps
  const startYRef = useRef<number | null>(null)
  const pullingRef = useRef(false)
  const pullDistRef = useRef(0)

  // Only setState for refreshing indicator (rare, not during gesture)
  const [showIndicator, setShowIndicator] = useState(false)
  const [reached, setReached] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const progressRef = useRef(0)

  // Apply transform to header + content simultaneously via direct DOM
  const applyTransform = (dist: number, animated: boolean) => {
    const t = animated ? "transform 0.3s cubic-bezier(0.22,1,0.36,1)" : "none"
    if (headerRef?.current) {
      headerRef.current.style.transform = dist > 0 ? `translateY(${dist}px)` : ""
      headerRef.current.style.transition = t
    }
    if (contentRef.current) {
      contentRef.current.style.transform = dist > 0 ? `translateY(${dist}px)` : ""
      contentRef.current.style.transition = t
    }
  }

  // Position indicator above header as you pull
  const positionIndicator = (dist: number) => {
    const el = indicatorRef.current
    if (!el) return
    // Centre the dot in the gap between screen top and the translated header
    const gap = dist  // how much the header has moved down
    const centerY = gap / 2 - 18 // 18 = half indicator height (36)
    el.style.top = `${Math.max(0, centerY)}px`
    // Update rotation
    const prog = Math.min(dist / threshold, 1)
    progressRef.current = prog
    const icon = el.querySelector<SVGElement>(".ptr-icon")
    if (icon) {
      icon.style.transform = `rotate(${prog * 270}deg)`
      icon.style.color = dist >= threshold ? "hsl(var(--primary))" : ""
    }
  }

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const isAtTop = (target: HTMLElement): boolean => {
      let node: HTMLElement | null = target
      while (node && node !== el) {
        const style = window.getComputedStyle(node)
        const oy = style.overflowY
        if ((oy === "auto" || oy === "scroll") && node.scrollHeight > node.clientHeight) {
          return node.scrollTop <= 0
        }
        node = node.parentElement
      }
      return el.scrollTop <= 0
    }

    const onTouchStart = (e: TouchEvent) => {
      if (isRefreshing) return
      const touch = e.touches[0]
      if (!touch) return
      if (!isAtTop(e.target as HTMLElement)) { startYRef.current = null; return }
      startYRef.current = touch.clientY
      pullingRef.current = false
    }

    const onTouchMove = (e: TouchEvent) => {
      if (isRefreshing || startYRef.current === null) return
      const touch = e.touches[0]
      if (!touch) return
      const delta = touch.clientY - startYRef.current
      if (delta <= 0) {
        if (pullingRef.current) {
          pullingRef.current = false
          pullDistRef.current = 0
          applyTransform(0, false)
          setShowIndicator(false)
          setReached(false)
        }
        return
      }
      // Rubber-band resistance
      const resisted = delta < threshold
        ? delta
        : threshold + (delta - threshold) * 0.35
      const dist = Math.min(resisted, maxPull)
      pullDistRef.current = dist
      pullingRef.current = true

      // Direct DOM — no React re-render during gesture
      applyTransform(dist, false)
      positionIndicator(dist)
      if (!showIndicator) setShowIndicator(true)
      const nowReached = dist >= threshold
      if (nowReached !== reached) setReached(nowReached)

      if (e.cancelable) e.preventDefault()
    }

    const onTouchEnd = () => {
      if (!pullingRef.current) { startYRef.current = null; return }
      const triggered = pullDistRef.current >= threshold
      startYRef.current = null
      pullingRef.current = false
      pullDistRef.current = 0
      applyTransform(0, true)
      setReached(false)
      if (triggered) {
        void trigger()
      } else {
        setShowIndicator(false)
      }
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true })
    el.addEventListener("touchmove", onTouchMove, { passive: false })
    el.addEventListener("touchend", onTouchEnd, { passive: true })
    el.addEventListener("touchcancel", onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener("touchstart", onTouchStart)
      el.removeEventListener("touchmove", onTouchMove)
      el.removeEventListener("touchend", onTouchEnd)
      el.removeEventListener("touchcancel", onTouchEnd)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRefreshing, threshold, maxPull, trigger, reached, showIndicator])

  // Sync refreshing state with indicator visibility
  useEffect(() => {
    if (isRefreshing) {
      setShowIndicator(true)
      setSpinning(true)
      applyTransform(40, true)
      return undefined
    } else {
      setSpinning(false)
      applyTransform(0, true)
      const t = setTimeout(() => setShowIndicator(false), 300)
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRefreshing])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "relative", overscrollBehaviorY: "contain" }}
    >
      {/* Indicator lives ABOVE the header — fixed to container top */}
      {showIndicator && (
        <div
          ref={indicatorRef}
          aria-hidden={!isRefreshing}
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            transform: "translateX(-50%)",
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
            pointerEvents: "none",
          }}
        >
          {spinning ? (
            <Loader2 className="size-4 animate-spin text-primary" />
          ) : (
            <RotateCw
              className="ptr-icon size-4 text-muted-foreground"
              style={{ transition: "transform 0.04s linear, color 0.15s" }}
            />
          )}
        </div>
      )}

      {/* Content — gets translateY via ref; flex chain preserved for inner scroll containers */}
      <div
        ref={contentRef}
        style={{ willChange: "transform", display: "flex", flexDirection: "column", flex: "1 1 0%", minHeight: 0 }}
      >
        {children}
      </div>
    </div>
  )
}
