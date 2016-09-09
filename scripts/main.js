const Worm          = require('./Model/Worm')
const { moveWorms }  = require('./App/Orientation')
const { normalizeWormsThatHaveCrashed } = require('./App/Crash')

// Initial population with random worms
let worms = [...(new Array(1))].map(value => Worm())

setInterval(() => {
  worms = moveWorms(worms)
  worms = normalizeWormsThatHaveCrashed(worms)
  console.log(worms);
  console.log('------');
}, 1000)
