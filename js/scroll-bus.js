class ScrollBus {
  constructor() {
    this.subscribers = new Set()
    this.isScheduled = false
    this.scrollData = {
      y: window.scrollY,
      vh: window.innerHeight,
    }

    // Single passive scroll listener that only schedules RAF
    window.addEventListener(
      "scroll",
      () => {
        if (!this.isScheduled) {
          this.isScheduled = true
          requestAnimationFrame(() => this.tick())
        }
      },
      { passive: true },
    )

    // Handle resize events
    window.addEventListener("resize", () => {
      this.scrollData.vh = window.innerHeight
      this.notifySubscribers()
    })
  }

  tick() {
    this.scrollData.y = window.scrollY
    this.scrollData.vh = window.innerHeight
    this.notifySubscribers()
    this.isScheduled = false
  }

  subscribe(callback) {
    this.subscribers.add(callback)
    // Immediately call with current data
    callback(this.scrollData)

    return () => {
      this.subscribers.delete(callback)
    }
  }

  notifySubscribers() {
    this.subscribers.forEach((callback) => {
      try {
        callback(this.scrollData)
      } catch (error) {
        console.error("ScrollBus subscriber error:", error)
      }
    })
  }
}

// Create global scroll bus instance
window.scrollBus = new ScrollBus()
