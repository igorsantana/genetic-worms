const Worm          = require('./Model/Worm')
const Orientation   = require('./App/Orientation')
const { uniqueCrashes, resolveCrashes, findCrashes, checkCrash } = require('./App/Crash')

const worms = [...(new Array(20))].map(value => Worm())
const worms2 = resolveCrashes(uniqueCrashes(findCrashes(worms)), worms)
