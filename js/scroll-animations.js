// Scroll-based animations for value cards
const cards = document.querySelectorAll(".value__item")

function updateXPosition() {
  if (window.innerWidth <= 480) {
    cards.forEach((card) => {
      card.style.transform = "translateX(0)"
    })
    return
  }

  const centerY = window.innerHeight / 2

  cards.forEach((card) => {
    const rect = card.getBoundingClientRect()
    const cardCenterY = rect.top + rect.height / 2
    const distance = Math.abs(centerY - cardCenterY)

    const maxOffset = 60
    const maxDistance = window.innerHeight / 2
    const ratio = Math.min(distance / maxDistance, 1)

    const offsetX = ratio * maxOffset
    const scale = 1 + (1 - ratio) * 0.1 // Center card slightly larger
    const opacity = 0.7 + (1 - ratio) * 0.3 // Center card more opaque

    card.style.transform = `translateX(${offsetX}px) scale(${scale})`
    card.style.opacity = opacity
  })
}

let ticking = false
function requestTick() {
  if (!ticking) {
    requestAnimationFrame(updateXPosition)
    ticking = true
    setTimeout(() => {
      ticking = false
    }, 16)
  }
}

window.addEventListener("scroll", requestTick)
window.addEventListener("resize", updateXPosition)
updateXPosition()
