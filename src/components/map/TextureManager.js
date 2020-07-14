import isMobile from 'is-mobile'
import { TextureLoader } from 'three'

export default class TextureManager {
  constructor (renderer) {
    const maxTextureSize = renderer.capabilities.maxTextureSize
    this.useHq = maxTextureSize >= 8192 && !isMobile({ tablet: true, featureDetect: true })
    try {
      this.webpSupported = document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0
    } catch (t) {
      this.webpSupported = false
    }
  }

  buildPath (prefix, name) {
    return `${process.env.BASE_URL}img/textures/${prefix}${name}.${this.webpSupported ? 'webp' : 'png'}`
  }

  load (textures) {
    const result = {}

    const textureLoader = new TextureLoader()

    return new Promise((resolve) => {
      Object.keys(textures).forEach((name) => {
        const texture = textures[name]

        const prefix = texture.hqAvailable && this.useHq ? 'hq_' : ''
        const path = this.buildPath(prefix, name)

        textureLoader.load(path, (data) => {
          texture.loaded = true
          result[name] = data

          if (Object.keys(textures).every(t => textures[t].loaded === true)) {
            resolve(result)
          }
        })
      })
    })
  }

  loadData (name, hqAvailable, channelsToKeep) {
    const channels = {}
    channelsToKeep.split('').forEach((c) => {
      channels[c] = channelsToKeep.indexOf(c)
    })

    const channelNames = Object.keys(channels)

    return new Promise((resolve) => {
      const image = new Image()

      image.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = image.width
        canvas.height = image.height

        const ctx = canvas.getContext('2d')
        ctx.drawImage(image, 0, 0)

        const raw = ctx.getImageData(0, 0, canvas.width, canvas.height)

        canvas.remove()

        const data = channelNames.length < 4 ? new Array(channelNames.length * raw.width * raw.height) : raw.data

        if (channelNames.length < 4) {
          for (let i = 0; i < raw.data.length / 4; i++) {
            if (channels.r !== undefined) {
              data[i * channelNames.length + channels.r] = raw.data[i * 4]
            }
            if (channels.g !== undefined) {
              data[i * channelNames.length + channels.g] = raw.data[i * 4 + 1]
            }
            if (channels.b !== undefined) {
              data[i * channelNames.length + channels.b] = raw.data[i * 4 + 2]
            }
            if (channels.a !== undefined) {
              data[i * channelNames.length + channels.a] = raw.data[i * 4 + 3]
            }
          }
        }

        resolve({ width: raw.width, height: raw.height, data })
      }

      image.src = this.buildPath(hqAvailable && this.useHq ? 'hq_' : '', name)
    })
  }
}
