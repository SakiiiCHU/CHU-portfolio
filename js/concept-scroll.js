class ConceptScrollManager {
  constructor() {
    this.heroSection = document.getElementById("hero")
    this.conceptSection = document.getElementById("concept")
    this.conceptHeadline = document.querySelector(".concept__headline--slide")
    this.isAutoScrolling = false
    this.isLocked = false
    this.hasEnteredConcept = false

    this.init()
  }

  init() {
    if (!this.heroSection || !this.conceptSection || !this.conceptHeadline) {
      console.warn("[v0] Concept scroll manager: Required elements not found")
      return
    }

    // Subscribe to scroll bus
    window.scrollBus.subscribe((scrollData) => {
      this.handleScroll(scrollData)
    })

    console.log("[v0] Concept scroll manager initialized")
  }

  handleScroll({ y, vh }) {
    const heroBottom = this.heroSection.offsetTop + this.heroSection.offsetHeight
    const conceptTop = this.conceptSection.offsetTop
    const conceptBottom = conceptTop + this.conceptSection.offsetHeight

    // Check if user is entering concept section from hero
    if (y >= heroBottom - vh * 0.1 && y < conceptBottom && !this.hasEnteredConcept && !this.isAutoScrolling) {
      this.hasEnteredConcept = true
      this.autoScrollToConceptBottom()
    }

    // Check if user is in concept section for snap behavior
    if (y >= conceptTop && y <= conceptBottom) {
      if (!this.isLocked) {
        this.activateSnapLock()
      }
    } else {
      if (this.isLocked) {
        this.deactivateSnapLock()
      }
      // Reset flag when user scrolls away from concept section
      if (y < conceptTop - vh || y > conceptBottom + vh) {
        this.hasEnteredConcept = false
      }
    }
  }

  autoScrollToConceptBottom() {
    console.log("[v0] Auto-scrolling to concept bottom")
    this.isAutoScrolling = true

    const conceptBottom = this.conceptSection.offsetTop + this.conceptSection.offsetHeight - window.innerHeight

    window.scrollTo({
      top: conceptBottom,
      behavior: "smooth",
    })

    // Reset auto-scroll flag after animation completes
    setTimeout(() => {
      this.isAutoScrolling = false
    }, 1000)
  }

  activateSnapLock() {
    console.log("[v0] Activating concept snap lock")
    this.isLocked = true
    this.conceptSection.classList.add("concept--locked")

    // Trigger text animation
    if (this.conceptHeadline && !this.conceptHeadline.classList.contains("is-in")) {
      this.conceptHeadline.classList.add("is-in")
    }
  }

  deactivateSnapLock() {
    console.log("[v0] Deactivating concept snap lock")
    this.isLocked = false
    this.conceptSection.classList.remove("concept--locked")

    // Remove text animation
    if (this.conceptHeadline) {
      this.conceptHeadline.classList.remove("is-in")
      this.conceptHeadline.classList.add("is-out")
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    new ConceptScrollManager()
  })
} else {
  new ConceptScrollManager()
}
