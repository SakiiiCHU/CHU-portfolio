importScripts("https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js")

self.onmessage = (e) => {
  const { compressed, id } = e.data

  try {
    // Use self.pako to explicitly access the global pako variable
    const decompressed = self.pako.inflate(new Uint8Array(compressed)).buffer
    self.postMessage(
      {
        decompressed: decompressed,
        id: id,
      },
      [decompressed],
    )
  } catch (error) {
    self.postMessage({
      error: error.message,
      id: id,
    })
  }
}
