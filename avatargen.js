'use strict'

const crypto = require('crypto')
const Jimp = require('jimp')

function getLayers(directory) {
  const path = require('path')
  let dirTree = require('directory-tree')
  let layers = dirTree(directory || './layers')
  let tree = {}

  function populateLeaf(leaf, arr) {
    for (let i=0; i < arr.length; i++) {
      if (arr[i].children) {
        let ob = {}
        populateLeaf(ob, arr[i].children)
        leaf[arr[i].name] = ob
      } else {
        leaf[path.parse(arr[i].name).name] = arr[i].path
      }
    }
  }

  populateLeaf(tree, layers.children)

  return tree
}

function loadImage(fn) {
  return new Promise((resolve, reject) => {
    Jimp.read('./' + fn , (err, image) => {
      if (err)  {
        resolve()
      } else {
        resolve(image)
      }
    })
  })
}

function fillZerosLeft(n) {
  var ret = '' + n

  while (ret.length < 3) {
    ret = '0' + ret
  }

  return ret
}

var layerKeysSorted = {}
function pickLayer(name, number, layers) {
  let layer = layers[name]
  let keys

  if (name in layerKeysSorted) {
    keys = layerKeysSorted[name]
  } else {
    keys = Object.keys(layer).sort()
    layerKeysSorted[name] = keys
  }

  if ((number < 0) || (number >= keys.length)) {
    return ''
  } else {
    return layer[keys[number]]
  }
}

function layerCount(name, layers) {
  let layer = layers[name]

  return Object.keys(layer).length
}

function newAvatar(layers, body, head, facial, mouth, eyes, hair) {
  return new Promise((resolve, reject) => {
    var image = new Jimp(32, 32, (err, baseimg) => {
      Promise.all([
        loadImage(pickLayer('Bodies', body, layers)),
        loadImage(pickLayer('Heads', head, layers)),
        loadImage(pickLayer('FacialFeatures', facial, layers)),
        loadImage(pickLayer('Mouths', mouth, layers)),
        loadImage(pickLayer('Eyes', eyes, layers)),
        loadImage(pickLayer('Head-do', hair, layers))
      ]).then((images) => {
        for (let i=0; i < images.length; i++) {
          let img = images[i]

          if (img) {
            baseimg.composite(img, 0, 0)
          }
        }

        resolve(baseimg)
      })
    })
  })
}

function rint(max) {
  return crypto.randomBytes(4).readUInt32LE(0) % max
}

function normalize(mat) {
  let n_max = 0
  let p_max = 0
  for (let i=0; i < mat.length; i++) {
    let row = mat[i]
    for (let j=0; j < row.length; j++) {
      let val = row[j]

      if ((val < 0) && (val < n_max)) {
        n_max -= val
      }

      if ((val > 0) && (val > p_max)) {
        p_max += val
      }
    }
  }

  for (let i=0; i < mat.length; i++) {
    let row = mat[i]
    for (let j=0; j < row.length; j++) {
      let val = row[j]
      if (val > 0) {
        row[j] = val / p_max
      } else if (val < 0) {
        row[j] = val / n_max
      }
    }
  }

  return mat
}

function avatarById(id, layers) {
  function slcrnd(card) {
    let num = parseInt(id.slice(0,2), 16)
    id = id.slice(2)
    let ret = num % card
    return ret
  }

  let body = slcrnd(layerCount('Bodies', layers))
  let head = slcrnd(layerCount('Heads', layers))
  let facial = slcrnd(layerCount('FacialFeatures', layers) + 1) // Uno mas para que no aparezca nada
  let mouth = slcrnd(layerCount('Mouths', layers))
  let eyes = slcrnd(layerCount('Eyes', layers))
  let hair = slcrnd(layerCount('Head-do', layers) + 1) // Uno mas para que no aparezca nada

  return newAvatar(layers, body, head, facial, mouth, eyes, hair).then(img => {
    if (slcrnd(13) < 5) {
      let hueVar = slcrnd(20) * 18
      img.color([
          { apply: 'hue', params: [ -hueVar ] }
      ])
    }

    if (slcrnd(23) < 2) {
      let satVar = slcrnd(10) * 10
      img.color([
          { apply: 'greyscale', params: [ satVar ] }
      ])
    }

    if (slcrnd(43) < 3) {
      let mat = [
        [ slcrnd(6)-3, slcrnd(6)-3, slcrnd(6)-3 ],
        [ slcrnd(6)-3, slcrnd(6)-3, slcrnd(6)-3 ],
        [ slcrnd(6)-3, slcrnd(6)-3, slcrnd(6)-3 ],
      ]

      normalize(mat)
      img.convolute(mat)
    }

    return img
  })
}

module.exports = ({salt, layers, directory}) => {
  const PEPE_AVATAR_SALT = 'Los avatares de Pepe son lo mejor de este mundo'
  if (!salt) {
    salt = PEPE_AVATAR_SALT
  }

  if (directory) {
    layers = getLayers(directory)
  } else if (!layers) {
    layers = getLayers()
  }

  return function (hid) {
    let hash = crypto.createHash('sha512')
    let id = parseInt(hid)
    if ((id !== Math.NaN) && (id < 1024 * 1024)) {
      hash.update(hid + salt)
      id = hash.digest('hex')

      return avatarById(id, layers)
    } else {
      throw new Error('Invalid Avatar ID')
    }
  }
}
