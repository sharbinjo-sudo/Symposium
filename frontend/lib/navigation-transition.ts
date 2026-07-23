export const PAGE_TRANSITION_EVENT = "cp26:page-transition:start"

type RouterLike = {
  push: (href: string) => void
  replace: (href: string) => void
}

export function startPageTransition(href?: string) {
  if (typeof window === "undefined") {
    return
  }

  window.dispatchEvent(
    new CustomEvent(PAGE_TRANSITION_EVENT, {
      detail: { href }
    })
  )
}

export function navigateWithLoading(
  router: RouterLike,
  href: string,
  method: "push" | "replace" = "push"
) {
  startPageTransition(href)
  router[method](href)
}

export function assignWithLoading(href: string) {
  startPageTransition(href)
  window.location.assign(href)
}
