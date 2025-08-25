// Smooth scrolling and scroll restoration management
// 1) Disable browser's automatic scroll restoration
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual"
}

// 2) On load, if URL has #hash, clear it and return to top
window.addEventListener("load", () => {
  if (location.hash) {
    history.replaceState(null, "", location.pathname + location.search)
  }
  // Wait two frames before scrolling to top to ensure layout is complete
  requestAnimationFrame(() => {
    requestAnimationFrame(() => window.scrollTo(0, 0))
  })
})

// 3) Intercept all links pointing to #id, use JS smooth scroll without changing URL
document.addEventListener("click", (e) => {
  const a = e.target.closest('a[href^="#"]')
  if (!a) return
  const id = a.getAttribute("href")
  if (id.length <= 1) return // Skip href="#" etc.
  const el = document.querySelector(id)
  if (!el) return
  e.preventDefault()
  el.scrollIntoView({ behavior: "smooth", block: "start" })
  // Clear hash to avoid jumping on refresh
  history.replaceState(null, "", location.pathname + location.search)
})
