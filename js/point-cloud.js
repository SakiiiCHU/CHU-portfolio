// Three.js Point Cloud Visualization
import * as THREE from "three"

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
    if (this.loaderProgress && this.loaderText) {
      this.loaderProgress.style.width = `${progress}%`
      this.loaderText.textContent = text || `Loading 3D Background... ${Math.round(progress)}%`
    }
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
    this.updateLoadingProgress(10, "Loading compressed point cloud files...")

    const loadFile1 = fetch("./linkou_1.bin.gz")
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        this.updateLoadingProgress(30, "Decompressing first point cloud...")
        return response.arrayBuffer()
      })
      .then((compressed) => {
        return window.pako.inflate(new Uint8Array(compressed)).buffer
      })

    const loadFile2 = fetch("./linkou_2.bin.gz")
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        this.updateLoadingProgress(50, "Decompressing second point cloud...")
        return response.arrayBuffer()
      })
      .then((compressed) => {
        return window.pako.inflate(new Uint8Array(compressed)).buffer
      })

    Promise.all([loadFile1, loadFile2])
      .then(([buffer1, buffer2]) => {
        this.updateLoadingProgress(70, "Processing point cloud data...")
        this.parseDualBinaryPointClouds(buffer1, buffer2)
      })
      .catch((error) => {
        console.warn("Dual BIN load failed:", error)
        this.updateLoadingProgress(40, "Trying fallback loading...")
        fetch("./linkou_1.bin.gz")
          .then((response) => response.arrayBuffer())
          .then((compressed) => window.pako.inflate(new Uint8Array(compressed)).buffer)
          .then((buffer) => {
            this.updateLoadingProgress(70, "Processing single point cloud...")
            this.parseBinaryPointCloud(buffer)
          })
          .catch(() => {
            this.updateLoadingProgress(80, "Creating fallback particles...")
            this.createFallbackParticles()
          })
      })
  }

  parseDualBinaryPointClouds(buffer1, buffer2) {
    this.updateLoadingProgress(80, "Parsing binary data...")

    const pointSize = 15 // 12 bytes float + 3 bytes color
    const numPoints1 = Math.floor(buffer1.byteLength / pointSize)
    const numPoints2 = Math.floor(buffer2.byteLength / pointSize)
    const totalPoints = numPoints1 + numPoints2

    if (totalPoints === 0) {
      console.warn("No valid points found in binary data")
      this.createFallbackParticles()
      return
    }

    this.fullPositions = new Float32Array(totalPoints * 3)
    this.fullColors = new Float32Array(totalPoints * 3)

    // Parse first file
    const dv1 = new DataView(buffer1)
    for (let i = 0; i < numPoints1; i++) {
      const offset = i * pointSize
      const x = dv1.getFloat32(offset, true)
      const y = dv1.getFloat32(offset + 4, true)
      const z = dv1.getFloat32(offset + 8, true)
      const r = dv1.getUint8(offset + 12)
      const g = dv1.getUint8(offset + 13)
      const b = dv1.getUint8(offset + 14)

      this.fullPositions.set([x, y, z], i * 3)
      this.fullColors.set([r / 255, g / 255, b / 255], i * 3)
    }

    // Parse second file
    const dv2 = new DataView(buffer2)
    for (let i = 0; i < numPoints2; i++) {
      const offset = i * pointSize
      const x = dv2.getFloat32(offset, true)
      const y = dv2.getFloat32(offset + 4, true)
      const z = dv2.getFloat32(offset + 8, true)
      const r = dv2.getUint8(offset + 12)
      const g = dv2.getUint8(offset + 13)
      const b = dv2.getUint8(offset + 14)

      const targetIndex = (numPoints1 + i) * 3
      this.fullPositions.set([x, y, z], targetIndex)
      this.fullColors.set([r / 255, g / 255, b / 255], targetIndex)
    }

    this.updateLoadingProgress(90, "Creating particle system...")

    const animationPointCount = Math.floor(totalPoints / 10)
    const positions = new Float32Array(animationPointCount * 3)
    const colors = new Float32Array(animationPointCount * 3)

    // Sample every 10th point for animation
    for (let i = 0; i < animationPointCount; i++) {
      const sourceIndex = i * 10
      positions.set(
        [
          this.fullPositions[sourceIndex * 3],
          this.fullPositions[sourceIndex * 3 + 1],
          this.fullPositions[sourceIndex * 3 + 2],
        ],
        i * 3,
      )
      colors.set(
        [this.fullColors[sourceIndex * 3], this.fullColors[sourceIndex * 3 + 1], this.fullColors[sourceIndex * 3 + 2]],
        i * 3,
      )
    }

    // Create animation geometry with reduced points
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))

    this.createParticleSystem(geometry)
  }

  parseBinaryPointCloud(buffer) {
    const pointSize = 15 // 12 bytes float + 3 bytes color
    const numPoints = Math.floor(buffer.byteLength / pointSize)

    if (numPoints === 0) {
      console.warn("No valid points found in binary data")
      this.createFallbackParticles()
      return
    }

    this.fullPositions = new Float32Array(numPoints * 3)
    this.fullColors = new Float32Array(numPoints * 3)

    const dv = new DataView(buffer)
    for (let i = 0; i < numPoints; i++) {
      const offset = i * pointSize
      const x = dv.getFloat32(offset, true)
      const y = dv.getFloat32(offset + 4, true)
      const z = dv.getFloat32(offset + 8, true)
      const r = dv.getUint8(offset + 12)
      const g = dv.getUint8(offset + 13)
      const b = dv.getUint8(offset + 14)

      this.fullPositions.set([x, y, z], i * 3)
      this.fullColors.set([r / 255, g / 255, b / 255], i * 3)
    }

    this.updateLoadingProgress(90, "Creating particle system...")

    const animationPointCount = Math.floor(numPoints / 10)
    const positions = new Float32Array(animationPointCount * 3)
    const colors = new Float32Array(animationPointCount * 3)

    // Sample every 10th point for animation
    for (let i = 0; i < animationPointCount; i++) {
      const sourceIndex = i * 10
      positions.set(
        [
          this.fullPositions[sourceIndex * 3],
          this.fullPositions[sourceIndex * 3 + 1],
          this.fullPositions[sourceIndex * 3 + 2],
        ],
        i * 3,
      )
      colors.set(
        [this.fullColors[sourceIndex * 3], this.fullColors[sourceIndex * 3 + 1], this.fullColors[sourceIndex * 3 + 2]],
        i * 3,
      )
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))

    this.createParticleSystem(geometry)
  }

  createParticleSystem(geometry) {
    this.updateLoadingProgress(95, "Initializing 3D scene...")

    const material = new THREE.PointsMaterial({
      size: 0.03,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
    })

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

    const positions = geometry.attributes.position.array
    const colors = geometry.attributes.color.array
    const particleCount = positions.length / 3

    this.targetPositions = []
    this.targetColors = []
    for (let i = 0; i < particleCount; i++) {
      const x = positions[i * 3]
      const y = positions[i * 3 + 1]
      const z = positions[i * 3 + 2]

      this.targetPositions.push(x, z, y)

      this.targetColors.push(colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2])
    }

    this.createInitialPatterns(particleCount)

    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(this.originalPositions), 3))
    geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(this.originalColors), 3))

    const pointCloud = new THREE.Points(geometry, material)
    this.pointClouds.push(pointCloud)
    this.scene.add(pointCloud)

    this.updateLoadingProgress(100, "Ready!")
    setTimeout(() => {
      this.hideLoader()
    }, 500)

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
    this.updateLoadingProgress(90, "Creating fallback particles...")

    const particleCount = 2000

    // Create target positions in sphere formation
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

      // Rainbow colors for fallback
      const hue = (i / particleCount) * 360
      const color = new THREE.Color().setHSL(hue / 360, 0.8, 0.6)
      this.targetColors.push(color.r, color.g, color.b)
    }

    this.createInitialPatterns(particleCount)

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(this.originalPositions), 3))
    geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(this.originalColors), 3))

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

    this.updateLoadingProgress(100, "Ready!")
    setTimeout(() => {
      this.hideLoader()
    }, 500)

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

    mainPointCloud.geometry.setAttribute("position", new THREE.Float32BufferAttribute(currentPositions, 3))
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

    mainPointCloud.geometry.setAttribute("color", new THREE.Float32BufferAttribute(currentColors, 3))
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
