const WormFactory       = require('./Model/Worm')
const Orientation       = require('./App/Orientation')
const { generateWorm }  = require('./App/Interactions')

const initialRanking  = { CHA: [], STR: [] }
const initialWorms    = [...(new Array(20))].map(value => WormFactory())
const initialLogs     = []


const worms = (worms = initialWorms, action) => {
  switch(action.type){
    case 'MOVE_WORM':
      const idx = action.index
      return [  ...worms.slice(0, idx), Orientation.moveWorm(worms[idx]), ...worms.slice(idx + 1) ]

    case 'KILL_WORM':
      const wormId = action.id
      return worms.filter(worm => worm.id != wormId)

    case 'GENERATE_WORM':
      const newWorm = generateWorm(action.parent1, action.parent2)
      return [...worms, newWorm]
  }

  return worms;
}

const logs = (state = initialLogs, action) => {

  return state;
}

const ranking = (state = initialRanking, action) => {

  return state;
}

module.exports = { worms, logs, ranking }
