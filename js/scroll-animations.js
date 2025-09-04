const cards = document.querySelectorAll(".experience__item")

function updateXPosition(scrollData) {
  if (window.innerWidth <= 480) {
    cards.forEach((card) => {
      card.style.transform = "translateX(0)"
    })
    return
  }

  const centerY = scrollData.vh / 2

  cards.forEach((card) => {
    const rect = card.getBoundingClientRect()
    const cardCenterY = rect.top + rect.height / 2
    const distance = Math.abs(centerY - cardCenterY)

    const maxOffset = 60
    const maxDistance = scrollData.vh / 2
    const ratio = Math.min(distance / maxDistance, 1)

    const offsetX = ratio * maxOffset
    const scale = 1 + (1 - ratio) * 0.1
    const opacity = 0.7 + (1 - ratio) * 0.3

    card.style.transform = `translateX(${offsetX}px) scale(${scale})`
    card.style.opacity = opacity
  })
}

window.scrollBus.subscribe(updateXPosition)

// Initial call for setup
updateXPosition({ y: window.scrollY, vh: window.innerHeight })
