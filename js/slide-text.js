// Slide text animations with intersection observer
document.addEventListener("DOMContentLoaded", () => {
  const headers = document.querySelectorAll(".concept__headline--slide")
  console.log("Found slide text elements:", headers.length) // Added debug logging

  if (!headers.length) return

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const el = entry.target
        console.log(" Slide text intersection:", entry.isIntersecting, el) // Added debug logging
        if (entry.isIntersecting) {
          el.classList.add("is-in")
          el.classList.remove("is-out")
          console.log(" Added is-in class to:", el) // Added debug logging
        } else {
          el.classList.remove("is-in")
          el.classList.add("is-out")
        }
      })
    },
    { threshold: 0.35 },
  )

  headers.forEach((h) => {
    console.log(" Observing slide text element:", h) // Added debug logging
    io.observe(h)
  })

  // Exit animation when leaving page
  const leaveAll = () => headers.forEach((h) => h.classList.add("leaving"))
  window.addEventListener("pagehide", leaveAll)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      leaveAll()
    }
  })
})
