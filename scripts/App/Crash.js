// Check the x and y axis to see if two worms crashed with each other.
const { generateWorm, fight, match }  = require('./Interactions')

const checkCrash = (w1, w2) => {
  return (w1.pos.x === w2.pos.x) || (w1.pos.x === w2.pos.y) || (w1.pos.y === w2.pos.x)
}

/*
  Find all the worms that have crashed while moving through the map.
  It returns an array of objects with two parameters: { w1, w2} that references
  the two worms that have crashed.
*/

const findCrashes = (worms) => {
  const crashes =
    worms.map(w1 => {
      const found = worms.filter(worm => worm.uniqueName !== w1.uniqueName)
                         .filter(fWorm => checkCrash(w1, fWorm))
      return found.length > 0 ? { w1 , w2: found[0] } : null
    }).filter(worm => worm != null)
    return crashes
}

/*
  Responsible for knowing what is going to happen to two worms that have crashed.
  If they are from the same gender, they will fight and one of them will die.
  If they are from different genders, they have a chance to generate a new Worm
*/
const resolveCrashes = (crashes, arrayOfWorms) => {
  crashes.forEach(pair => {
    if(pair.w1.gender === pair.w2.gender){
      const loser  = fight(pair.w1, pair.w2)
      arrayOfWorms = arrayOfWorms.filter(worm => worm.uniqueName !== loser.uniqueName)
    } else {
      if(match(pair.w1, pair.w2)){
        const son = generateWorm(pair.w1, pair.w2)
        arrayOfWorms = [...arrayOfWorms, son]
      }
    }
  })
  return arrayOfWorms
}

// Removes duplicated crashes from the array of crashes.
const uniqueCrashes = (crashes = []) => {
  const uniqCrashes = []
  const values = {}
  crashes.forEach(crash => {
    const w1Name = crash.w1.uniqueName, w2Name = crash.w2.uniqueName
    const isUniq = uniqCrashes.filter(value => (value.indexOf(w1Name) != -1 ||
                                                value.indexOf(w2Name) != -1)).length == 0
    if(isUniq)
      uniqCrashes.push(w1Name + '#' + w2Name)
      values[w1Name + '#' + w2Name] = crash
  })
  return uniqCrashes.map(v => values[v])
}

module.exports = { uniqueCrashes, resolveCrashes, findCrashes, checkCrash }
