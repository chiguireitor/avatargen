**** Avatar Generation library

** Install

```
npm install avatargen
```

** Usage

```javascript
const Jimp = require('jimp')
const avatargen = require('avatargen')({
  salt: 'CUSTOM SALT',
  layers: { ... layer json ...}, //Optional
  directory: 'path to directory tree containing the layers'
})

avatargen(1) // Generate the avatar with ID 1
  .then((img) => {
    // img is a JIMP compatible image
  })
```

The layer directory (or the layers json) should contain first level elements with the following case-sensitive names:

 * Bodies
 * Heads
 * FacialFeatures
 * Mouths
 * Eyes
 * Head-do

"FacialFeatures" and "Head-do" can be picked empty during generation, to allow non-facial features or no hair.

** License

See LICENSE
