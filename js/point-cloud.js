// Three.js Point Cloud Visualization
import * as THREE from "three"

let simulatedProgress = 0
let animationFrameId

function simulateProgressLoading(onComplete) {
  const targetProgress = 90 + Math.random() * 10 // 模擬最多90-99%
  function animate() {
    simulatedProgress += (targetProgress - simulatedProgress) * 0.05
    updateProgressBar(simulatedProgress)
    if (simulatedProgress < targetProgress - 0.5) {
      animationFrameId = requestAnimationFrame(animate)
    } else {
      cancelAnimationFrame(animationFrameId)
      onComplete() // 等 fetch + 解壓完成再觸發這個補滿
    }
  }
  animate()
}

function completeProgressBar() {
  simulatedProgress = 100
  updateProgressBar(simulatedProgress)
}

function updateProgressBar(progress) {
  const loaderProgress = document.getElementById("loader-progress")
  const loaderText = document.getElementById("loader-text")
  if (loaderProgress && loaderText) {
    loaderProgress.style.width = `${progress}%`
    loaderText.textContent = `Loading 3D Background... ${Math.round(progress)}%`
  }
}

class PointCloudEffect {
  constructor() {
    this.scene = null
    this.camera = null
    this.renderer = null
    this.pointClouds = [] // Array to hold multiple point clouds
    this.originalPositions = []
    this.targetPositions = []
    this.animationProgress = 0
    this.isAnimating = false
    this.animationStartTime = 0
    this.isInitialized = false
    this.animationId = null
    this.animationPhase = 0
    this.particleDelays = []
    this.originalColors = []
    this.targetColors = []
    this.fullPositions = null
    this.fullColors = null
    this.hasUpgraded = false

    this.loaderElement = document.getElementById("pointcloud-loader")
    this.loaderProgress = document.getElementById("loader-progress")
    this.loaderText = document.getElementById("loader-text")

    this.init()
    this.setupPageVisibilityHandling()
  }

  updateLoadingProgress(progress, text = "") {
    updateProgressBar(progress)
  }

  hideLoader() {
    if (this.loaderElement) {
      this.loaderElement.style.opacity = "0"
      setTimeout(() => {
        this.loaderElement.style.display = "none"
      }, 500)
    }
  }

  setupPageVisibilityHandling() {
    const cleanup = () => {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId)
      }
      this.pointClouds.forEach((pointCloud) => {
        if (pointCloud.geometry) {
          pointCloud.geometry.dispose()
        }
        if (pointCloud.material) {
          pointCloud.material.dispose()
        }
        if (this.scene) {
          this.scene.remove(pointCloud)
        }
      })
      if (this.renderer) {
        this.renderer.dispose()
        this.renderer.forceContextLoss()
      }
    }

    window.addEventListener("beforeunload", cleanup)
    window.addEventListener("pagehide", cleanup)

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        if (!this.isInitialized || !this.renderer || this.renderer.getContext().isContextLost()) {
          this.reinitialize()
        } else {
          this.resumeAnimation()
        }
      } else {
        this.pauseAnimation()
      }
    })

    const canvas = document.getElementById("hero-pointcloud")
    if (canvas) {
      canvas.addEventListener("webglcontextlost", (event) => {
        event.preventDefault()
        this.pauseAnimation()
      })

      canvas.addEventListener("webglcontextrestored", () => {
        this.reinitialize()
      })
    }
  }

  pauseAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  resumeAnimation() {
    if (!this.animationId && this.isInitialized) {
      this.animate()
    }
  }

  reinitialize() {
    this.isInitialized = false

    this.pointClouds.forEach((pointCloud) => {
      if (this.scene) {
        this.scene.remove(pointCloud)
      }
    })
    this.pointClouds = []

    this.init()
  }

  init() {
    const canvas = document.getElementById("hero-pointcloud")
    if (!canvas) {
      console.error("Canvas element not found")
      return
    }

    this.scene = new THREE.Scene()
    this.scene.background = null

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.01, 1000)
    this.camera.position.set(0, 2, 8)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
    })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setClearColor(0x000000, 0)

    const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
    this.scene.add(ambientLight)

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight1.position.set(5, 5, 5)
    this.scene.add(directionalLight1)

    this.loadBINFile()

    this.setupControls()
    window.addEventListener("resize", () => this.onWindowResize())
    this.animate()
    this.isInitialized = true
  }

  loadBINFile() {
    simulateProgressLoading(() => {
      this.loadPreviewFiles()
    })
  }

  loadPreviewFiles() {
    console.log("[v0] Loading preview files first...")

    Promise.all([this.loadSingleFile("./linkou_1_preview.bin.gz"), this.loadSingleFile("./linkou_2_preview.bin.gz")])
      .then((results) => {
        const [data1, data2] = results
        if (data1 && data2) {
          console.log("[v0] Preview files loaded successfully")
          this.createPreviewPointCloud(data1, data2)
          completeProgressBar()
          this.hideLoader()

          // Start loading full resolution files in background
          this.loadFullResolutionFiles()
        } else {
          throw new Error("Failed to load preview files")
        }
      })
      .catch((error) => {
        console.log("[v0] Preview files load failed, creating fallback particles:", error)
        this.createFallbackParticles()
        completeProgressBar()
        this.hideLoader()
      })
  }

  loadFullResolutionFiles() {
    console.log("[v0] Loading full resolution files in background...")

    Promise.all([this.loadSingleFile("./linkou_1.bin.gz"), this.loadSingleFile("./linkou_2.bin.gz")])
      .then((results) => {
        const [data1, data2] = results
        if (data1 && data2) {
          console.log("[v0] Full resolution files loaded successfully")
          this.upgradeToFullResolution(data1, data2)
        } else {
          console.log("[v0] Full resolution files not available, keeping preview")
        }
      })
      .catch((error) => {
        console.log("[v0] Full resolution files load failed, keeping preview:", error)
      })
  }

  async loadSingleFile(url) {
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

      const compressed = await response.arrayBuffer()
      const decompressed = window.pako.inflate(new Uint8Array(compressed)).buffer

      return this.parseBinaryData(decompressed)
    } catch (error) {
      console.warn(`Failed to load ${url}:`, error)
      return null
    }
  }

  parseBinaryData(buffer) {
    const pointSize = 15 // 12 bytes float + 3 bytes color
    const numPoints = Math.floor(buffer.byteLength / pointSize)

    const positions = new Float32Array(numPoints * 3)
    const colors = new Float32Array(numPoints * 3)

    const dv = new DataView(buffer)
    for (let i = 0; i < numPoints; i++) {
      const offset = i * pointSize
      const x = dv.getFloat32(offset, true)
      const y = dv.getFloat32(offset + 4, true)
      const z = dv.getFloat32(offset + 8, true)
      const r = dv.getUint8(offset + 12)
      const g = dv.getUint8(offset + 13)
      const b = dv.getUint8(offset + 14)

      positions.set([x, y, z], i * 3)
      colors.set([r / 255, g / 255, b / 255], i * 3)
    }

    return { positions, colors }
  }

  createPreviewPointCloud(data1, data2) {
    const totalPoints = (data1.positions.length + data2.positions.length) / 3
    const mergedPositions = new Float32Array(totalPoints * 3)
    const mergedColors = new Float32Array(totalPoints * 3)

    mergedPositions.set(data1.positions, 0)
    mergedPositions.set(data2.positions, data1.positions.length)
    mergedColors.set(data1.colors, 0)
    mergedColors.set(data2.colors, data1.colors.length)

    console.log("[v0] Preview point cloud created with", totalPoints, "points")

    // Apply transformations
    const transformedData = this.transformPointCloudData(mergedPositions, mergedColors)

    // Create particle system with preview data
    this.createParticleSystemFromData(transformedData.positions, transformedData.colors)
  }

  upgradeToFullResolution(data1, data2) {
    const totalPoints = (data1.positions.length + data2.positions.length) / 3
    const mergedPositions = new Float32Array(totalPoints * 3)
    const mergedColors = new Float32Array(totalPoints * 3)

    mergedPositions.set(data1.positions, 0)
    mergedPositions.set(data2.positions, data1.positions.length)
    mergedColors.set(data1.colors, 0)
    mergedColors.set(data2.colors, data1.colors.length)

    console.log("[v0] Upgrading to full resolution with", totalPoints, "points")

    // Store full resolution data for later upgrade
    this.fullPositions = mergedPositions
    this.fullColors = mergedColors

    // Apply transformations
    const transformedData = this.transformPointCloudData(mergedPositions, mergedColors)

    // Replace current geometry with full resolution
    const mainPointCloud = this.pointClouds[0]
    if (mainPointCloud) {
      mainPointCloud.geometry.dispose()

      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute("position", new THREE.BufferAttribute(transformedData.positions, 3))
      geometry.setAttribute("color", new THREE.BufferAttribute(transformedData.colors, 3))

      geometry.attributes.position.needsUpdate = true
      geometry.attributes.color.needsUpdate = true

      mainPointCloud.geometry = geometry

      // Adjust material for dense point cloud
      if (totalPoints > 50000) {
        mainPointCloud.material.size = 0.02
      }

      console.log("[v0] Successfully upgraded to full resolution")
    }
  }

  transformPointCloudData(positions, colors) {
    const tempGeometry = new THREE.BufferGeometry()
    tempGeometry.setAttribute("position", new THREE.BufferAttribute(positions.slice(), 3))

    // Apply same transformations as original system
    tempGeometry.computeBoundingBox()
    const box = tempGeometry.boundingBox
    const center = new THREE.Vector3()
    box.getCenter(center)
    tempGeometry.translate(-center.x, -center.y, -center.z)

    const size = new THREE.Vector3()
    box.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z)
    const scale = 12 / maxDim
    tempGeometry.scale(scale, scale, scale)

    // Apply coordinate transformation (x, z, y)
    const transformedPositions = tempGeometry.attributes.position.array
    for (let i = 0; i < transformedPositions.length; i += 3) {
      const x = transformedPositions[i]
      const y = transformedPositions[i + 1]
      const z = transformedPositions[i + 2]
      transformedPositions[i] = x
      transformedPositions[i + 1] = z
      transformedPositions[i + 2] = y
    }

    tempGeometry.dispose()

    return {
      positions: transformedPositions,
      colors: colors,
    }
  }

  createParticleSystemFromData(positions, colors) {
    const particleCount = positions.length / 3

    // Create target positions from point cloud data
    this.targetPositions = Array.from(positions)
    this.targetColors = Array.from(colors)

    this.createInitialPatterns(particleCount)

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(this.originalPositions), 3))
    geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(this.originalColors), 3))

    geometry.attributes.position.needsUpdate = true
    geometry.attributes.color.needsUpdate = true

    const material = new THREE.PointsMaterial({
      size: 0.03,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
    })

    const pointCloud = new THREE.Points(geometry, material)
    this.pointClouds.push(pointCloud)
    this.scene.add(pointCloud)

    console.log("[v0] Particle system created and added to scene, particle count:", particleCount)
    this.startAnimation()
  }

  createInitialPatterns(particleCount) {
    this.originalPositions = []
    this.originalColors = []
    this.particleDelays = []

    for (let i = 0; i < particleCount; i++) {
      const radius = 4 + Math.random() * 8
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI

      this.originalPositions.push(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi),
      )

      this.originalColors.push(
        0.1 + Math.random() * 0.2, // Very dim colors for background effect
        0.2 + Math.random() * 0.3,
        0.3 + Math.random() * 0.4,
      )

      this.particleDelays.push(Math.random() * 0.5)
    }
  }

  createFallbackParticles() {
    console.log("[v0] Creating fallback particles")
    const particleCount = 2000

    this.targetPositions = []
    this.targetColors = []
    for (let i = 0; i < particleCount; i++) {
      const radius = 6 + Math.random() * 2
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI

      this.targetPositions.push(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi),
      )

      const hue = (i / particleCount) * 360
      const color = new THREE.Color().setHSL(hue / 360, 0.8, 0.6)
      this.targetColors.push(color.r, color.g, color.b)
    }

    this.createInitialPatterns(particleCount)

    console.log(
      "[v0] Fallback data lengths - positions:",
      this.originalPositions.length,
      "colors:",
      this.originalColors.length,
    )

    const geometry = new THREE.BufferGeometry()
    const positionArray = new Float32Array(this.originalPositions)
    const colorArray = new Float32Array(this.originalColors)

    geometry.setAttribute("position", new THREE.BufferAttribute(positionArray, 3))
    geometry.setAttribute("color", new THREE.BufferAttribute(colorArray, 3))

    geometry.attributes.position.needsUpdate = true
    geometry.attributes.color.needsUpdate = true

    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
    })

    const pointCloud = new THREE.Points(geometry, material)
    this.pointClouds.push(pointCloud)
    this.scene.add(pointCloud)

    console.log("[v0] Fallback particles created and added to scene, particle count:", particleCount)
    this.startAnimation()
  }

  startAnimation() {
    this.isAnimating = true
    this.animationStartTime = Date.now()
  }

  setupControls() {
    let mouseX = 0,
      mouseY = 0
    let targetRotationX = 0,
      targetRotationY = 0

    document.addEventListener("mousemove", (event) => {
      mouseX = (event.clientX - window.innerWidth / 2) / window.innerWidth
      mouseY = (event.clientY - window.innerHeight / 2) / window.innerHeight

      targetRotationX = mouseY * 0.2
      targetRotationY = mouseX * 0.2
    })

    const updateRotation = () => {
      this.pointClouds.forEach((pointCloud) => {
        if (pointCloud) {
          pointCloud.rotation.x += (targetRotationX - pointCloud.rotation.x) * 0.05
          pointCloud.rotation.y += (targetRotationY - pointCloud.rotation.y) * 0.05
        }
      })
      requestAnimationFrame(updateRotation)
    }
    updateRotation()
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate())

    const mainPointCloud = this.pointClouds[0]

    if (this.isAnimating && mainPointCloud) {
      const elapsed = Date.now() - this.animationStartTime
      const totalDuration = 4000
      this.animationProgress = Math.min(elapsed / totalDuration, 1)

      this.updateParticlePositions(this.animationProgress)
      this.updateParticleColors(this.animationProgress)

      if (this.animationProgress >= 1) {
        this.isAnimating = false
      }
    }

    if (!this.isAnimating && mainPointCloud) {
      const time = Date.now() * 0.001
      mainPointCloud.rotation.y += 0.003

      const breathe = 1 + Math.sin(time * 0.5) * 0.02
      mainPointCloud.scale.setScalar(breathe)

      if (mainPointCloud.material) {
        mainPointCloud.material.opacity = 0.85 + Math.sin(time * 0.8) * 0.1
      }
    }

    this.renderer.render(this.scene, this.camera)
  }

  updateParticlePositions(progress) {
    const mainPointCloud = this.pointClouds[0]
    if (!mainPointCloud) return

    const currentPositions = []
    const particleCount = this.originalPositions.length / 3

    for (let i = 0; i < particleCount; i++) {
      const delay = this.particleDelays[i]
      const adjustedProgress = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)))

      const easing = 1 - Math.pow(1 - adjustedProgress, 2)

      currentPositions.push(
        this.originalPositions[i * 3] + (this.targetPositions[i * 3] - this.originalPositions[i * 3]) * easing,
        this.originalPositions[i * 3 + 1] +
          (this.targetPositions[i * 3 + 1] - this.originalPositions[i * 3 + 1]) * easing,
        this.originalPositions[i * 3 + 2] +
          (this.targetPositions[i * 3 + 2] - this.originalPositions[i * 3 + 2]) * easing,
      )
    }

    const positionArray = new Float32Array(currentPositions)
    mainPointCloud.geometry.setAttribute("position", new THREE.BufferAttribute(positionArray, 3))
    mainPointCloud.geometry.attributes.position.needsUpdate = true
  }

  updateParticleColors(progress) {
    const mainPointCloud = this.pointClouds[0]
    if (!mainPointCloud) return

    const currentColors = []
    const particleCount = this.originalColors.length / 3

    for (let i = 0; i < particleCount; i++) {
      const colorProgress = Math.min(1, progress * 1.2)

      currentColors.push(
        this.originalColors[i * 3] + (this.targetColors[i * 3] - this.originalColors[i * 3]) * colorProgress,
        this.originalColors[i * 3 + 1] +
          (this.targetColors[i * 3 + 1] - this.originalColors[i * 3 + 1]) * colorProgress,
        this.originalColors[i * 3 + 2] +
          (this.targetColors[i * 3 + 2] - this.originalColors[i * 3 + 2]) * colorProgress,
      )
    }

    const colorArray = new Float32Array(currentColors)
    mainPointCloud.geometry.setAttribute("color", new THREE.BufferAttribute(colorArray, 3))
    mainPointCloud.geometry.attributes.color.needsUpdate = true

    if (progress >= 1 && this.fullPositions && this.fullColors) {
      this.switchToFullResolution()
    }
  }

  switchToFullResolution() {
    if (this.hasUpgraded) return // Prevent multiple upgrades
    this.hasUpgraded = true

    const mainPointCloud = this.pointClouds[0]
    if (!mainPointCloud) return

    // Process full resolution data
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute("position", new THREE.BufferAttribute(this.fullPositions.slice(), 3))
    geometry.setAttribute("color", new THREE.BufferAttribute(this.fullColors.slice(), 3))

    // Apply same transformations as animation version
    geometry.computeBoundingBox()
    const box = geometry.boundingBox
    const center = new THREE.Vector3()
    box.getCenter(center)
    geometry.translate(-center.x, -center.y, -center.z)

    const size = new THREE.Vector3()
    box.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z)
    const scale = 12 / maxDim
    geometry.scale(scale, scale, scale)

    // Apply coordinate transformation (x, z, y)
    const positions = geometry.attributes.position.array
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]
      const y = positions[i + 1]
      const z = positions[i + 2]
      positions[i] = x
      positions[i + 1] = z
      positions[i + 2] = y
    }
    geometry.attributes.position.needsUpdate = true

    // Replace geometry with full resolution version
    mainPointCloud.geometry.dispose()
    mainPointCloud.geometry = geometry
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  try {
    new PointCloudEffect()
  } catch (error) {
    console.error("Failed to initialize dual point cloud:", error)
    const loader = document.getElementById("pointcloud-loader")
    if (loader) {
      loader.style.display = "none"
    }
  }
})
