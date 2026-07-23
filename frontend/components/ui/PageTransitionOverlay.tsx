"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { PAGE_TRANSITION_EVENT } from "@/lib/navigation-transition"

const MIN_VISIBLE_MS = 560
const SAFETY_TIMEOUT_MS = 12000

function isModifiedEvent(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
}

function shouldHandleAnchor(anchor: HTMLAnchorElement) {
  if (anchor.target && anchor.target !== "_self") {
    return false
  }

  if (anchor.hasAttribute("download")) {
    return false
  }

  const href = anchor.getAttribute("href")
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false
  }

  return true
}

function sameDestination(currentUrl: URL, nextUrl: URL) {
  return currentUrl.pathname === nextUrl.pathname && currentUrl.search === nextUrl.search
}

function PageTransitionVisual() {
  return (
    <div className="page-transition-overlay-shell">
      <div className="page-transition-grid" aria-hidden="true" />
      <div className="page-transition-glow page-transition-glow-one" aria-hidden="true" />
      <div className="page-transition-glow page-transition-glow-two" aria-hidden="true" />
      <div className="page-transition-panel">
        <div className="page-transition-badge">CYBERPUNK&apos;26</div>
        <div className="page-transition-orbit" aria-hidden="true">
          <span className="page-transition-ring page-transition-ring-outer" />
          <span className="page-transition-ring page-transition-ring-middle" />
          <span className="page-transition-core" />
        </div>
        <div className="page-transition-copy">
          <strong>Switching pages</strong>
          <span>Loading the next view for you.</span>
        </div>
        <div className="page-transition-progress" aria-hidden="true">
          <span className="page-transition-progress-bar" />
        </div>
      </div>
    </div>
  )
}

export function PageTransitionFallback() {
  return (
    <div
      className="page-transition-overlay page-transition-overlay-static"
      role="status"
      aria-live="polite"
      aria-label="Loading next page"
    >
      <PageTransitionVisual />
    </div>
  )
}

export function PageTransitionOverlay() {
  const pathname = usePathname()
  const reducedMotion = useReducedMotion()
  const [visible, setVisible] = useState(false)
  const previousRouteRef = useRef(pathname)
  const shownAtRef = useRef(0)
  const hideTimerRef = useRef<number | null>(null)
  const safetyTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current)
      }
      if (safetyTimerRef.current) {
        window.clearTimeout(safetyTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const openOverlay = (href?: string) => {
      const currentUrl = new URL(window.location.href)

      if (href) {
        const nextUrl = new URL(href, currentUrl.href)
        if (nextUrl.origin !== currentUrl.origin || sameDestination(currentUrl, nextUrl)) {
          return
        }
      }

      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current)
      }
      if (safetyTimerRef.current) {
        window.clearTimeout(safetyTimerRef.current)
      }

      shownAtRef.current = Date.now()
      setVisible(true)
      safetyTimerRef.current = window.setTimeout(() => {
        setVisible(false)
      }, SAFETY_TIMEOUT_MS)
    }

    const handlePointerNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || isModifiedEvent(event)) {
        return
      }

      const target = event.target
      if (!(target instanceof Element)) {
        return
      }

      const anchor = target.closest("a[href]")
      if (!(anchor instanceof HTMLAnchorElement) || !shouldHandleAnchor(anchor)) {
        return
      }

      openOverlay(anchor.href)
    }

    const handleTransitionEvent = (event: Event) => {
      const detail = event instanceof CustomEvent ? (event.detail as { href?: string } | null) : null
      openOverlay(detail?.href)
    }

    document.addEventListener("click", handlePointerNavigation, true)
    window.addEventListener(PAGE_TRANSITION_EVENT, handleTransitionEvent as EventListener)

    return () => {
      document.removeEventListener("click", handlePointerNavigation, true)
      window.removeEventListener(PAGE_TRANSITION_EVENT, handleTransitionEvent as EventListener)
    }
  }, [])

  useEffect(() => {
    if (previousRouteRef.current === pathname) {
      return
    }

    previousRouteRef.current = pathname

    if (!visible) {
      return
    }

    if (safetyTimerRef.current) {
      window.clearTimeout(safetyTimerRef.current)
    }

    const elapsed = Date.now() - shownAtRef.current
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed)

    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current)
    }

    hideTimerRef.current = window.setTimeout(() => {
      setVisible(false)
    }, remaining)
  }, [pathname, visible])

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="page-transition-overlay"
          role="status"
          aria-live="polite"
          aria-label="Loading next page"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0.01 : 0.22, ease: "easeOut" }}
        >
          <PageTransitionVisual />
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
