// Animated text effects for experience section
const experienceTitle = document.querySelector(".experience-animated")
const spans = experienceTitle.querySelectorAll("span")

// Set initial random flying directions
spans.forEach((span, i) => {
  const angle = Math.random() * 360
  const distance = 100 + Math.random() * 200
  const dx = Math.cos(angle) * distance
  const dy = Math.sin(angle) * distance
  const r = Math.random() * 360 - 180
  span.style.setProperty("--dx", `${dx}px`)
  span.style.setProperty("--dy", `${dy}px`)
  span.style.setProperty("--r", `${r}deg`)
})

// Intersection Observer: trigger in-view when entering viewport
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        experienceTitle.classList.add("in-view")
      }
    })
  },
  {
    threshold: 0.2,
  },
)

observer.observe(experienceTitle)

// Sticky behavior when scrolling
window.addEventListener("scroll", () => {
  const stickyTrigger = experienceTitle.getBoundingClientRect().top
  if (stickyTrigger <= 50) {
    experienceTitle.classList.add("sticky")
  } else {
    experienceTitle.classList.remove("sticky")
  }
})
