// Slide text animations with intersection observer
document.addEventListener("DOMContentLoaded", () => {
  const headers = document.querySelectorAll(".slide-text")
  if (!headers.length) return

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const el = entry.target
        if (entry.isIntersecting) {
          el.classList.add("is-in")
          el.classList.remove("is-out")
        } else {
          el.classList.remove("is-in")
          el.classList.add("is-out")
        }
      })
    },
    { threshold: 0.35 },
  )

  headers.forEach((h) => io.observe(h))

  // Exit animation when leaving page
  const leaveAll = () => headers.forEach((h) => h.classList.add("leaving"))
  window.addEventListener("pagehide", leaveAll)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      leaveAll()
    }
  })
})
