import { useEffect, useMemo, useRef, useState } from 'react'
import type { Deck } from '@shared/types'
import { buildSlideDocument } from '@shared/deckHtml'
import { slideSize } from '@shared/video'

interface Props {
  deck: Deck
  index: number
  /** Fixed width in px. When omitted the frame fills its parent, keeping the slide's shape. */
  width?: number
  animate?: boolean
  /** Thumbnails ignore the mouse so clicks select the slide. */
  interactive?: boolean
}

/**
 * Renders one slide in a sandboxed iframe (scripts run, but the slide can't
 * reach the app) and scales the canvas (1280x720, or the video's size) to the available size.
 */
export function SlideFrame({ deck, index, width, animate = false, interactive = false }: Props) {
  const slide = deck.slides[index]
  const { width: SLIDE_WIDTH, height: SLIDE_HEIGHT } = slideSize(deck)
  const hostRef = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState({ w: width ?? 0, h: width ? (width * SLIDE_HEIGHT) / SLIDE_WIDTH : 0 })

  useEffect(() => {
    if (width) {
      setFit({ w: width, h: (width * SLIDE_HEIGHT) / SLIDE_WIDTH })
      return
    }
    const host = hostRef.current?.parentElement
    if (!host) return
    const measure = (): void => {
      const r = host.getBoundingClientRect()
      const scale = Math.min(r.width / SLIDE_WIDTH, r.height / SLIDE_HEIGHT)
      setFit({ w: SLIDE_WIDTH * scale, h: SLIDE_HEIGHT * scale })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(host)
    return () => ro.disconnect()
  }, [width, SLIDE_WIDTH, SLIDE_HEIGHT])

  // Only rebuild (and so reload the iframe) when something this slide uses changes.
  const srcDoc = useMemo(
    () => buildSlideDocument(deck, index, { animate }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slide, deck.themeId, deck.css, deck.kind, deck.format, index, animate]
  )

  const scale = fit.w / SLIDE_WIDTH
  return (
    <div ref={hostRef} className="slide-frame" style={{ width: fit.w, height: fit.h }}>
      {fit.w > 0 && (
        <iframe
          title={`Slide ${index + 1}`}
          sandbox="allow-scripts"
          srcDoc={srcDoc}
          tabIndex={interactive ? 0 : -1}
          style={{
            width: SLIDE_WIDTH,
            height: SLIDE_HEIGHT,
            transform: `scale(${scale})`,
            pointerEvents: interactive ? 'auto' : 'none'
          }}
        />
      )}
    </div>
  )
}
