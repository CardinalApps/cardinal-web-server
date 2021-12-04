const fs = require('fs')

/**
 * Parses a file on the disk and creates a waveform based on the audio data.
 * 
 * @param {string} path - Path to the audio file on the system.
 * @param {number} samples - Number of samples to create. Defaults to 10,000.
 */
export function createWaveform(path, samples = 2000) {
  return new Promise(async (resolve, reject) => {

    // uncomment to simulate long waveform computation
    // await new Promise((r, rr) => {
    //   setTimeout(() => {
    //     r()
    //   }, 4000)
    // })

    console.log('samples:', samples)

    const audioContext = new AudioContext()
    let buffer = fs.readFileSync(path)
    let Uint8 = new Uint8Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength))
    
    // convert the Uint8Array to an ArrayBuffer
    let arrayBuffer = Uint8.buffer.slice(Uint8.byteOffset, Uint8.byteLength + Uint8.byteOffset)

    // decode the ArrayBuffer
    audioContext.decodeAudioData(arrayBuffer, (audioBuffer) => {
      // we only need the data from one channel
      let channelData = audioBuffer.getChannelData(0)
      let blockSize = Math.floor(channelData.length / samples)
      let filteredData = []

      // pull blocks from the channel data
      for (let i = 0; i < samples; i++) {
        let blockStart = blockSize * i
        let sum = 0

        for (let j = 0; j < blockSize; j++) {
          sum = sum + Math.abs(channelData[blockStart + j])
        }

        filteredData.push(channelData[i * blockSize])
      }

      // normalize the blocks
      let multiplier = Math.pow(Math.max(...filteredData), -1)

      let normalized = filteredData.map((n) => {
        return n * multiplier
      })

      resolve(normalized)
    })

  })
}