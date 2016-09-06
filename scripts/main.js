'use strict'
/*
  The biggest value found in Charisma or Strength, these will be useful
  for creating new pseudo-random Worms attributes.
*/
const MAX_STR = 5
const MAX_CHA = 5

// Function used to generate ids for the worms
// TODO: Change Math.random() to a time-based id.
const generateId = (size) => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'
  return [...(new Array(size))].map(value => chars.charAt(Math.random() * chars.length)).join('')
}
/*
  The worm object. You can initialize it with custom strength and charisma like in the generation process.
  But you can also generate a new Worm without initialize the values, and i'm thinking in using this as a form
  of mutation.
*/
const Worm = (strength = 0, charisma = 0) => {
  // Randomly generated gender
  const gender      = parseInt(Math.random() * 10) < 5 ? 'MALE' : 'FEMALE'
  const uniqueName  = generateId(16)
  const attr  = {
    strength: strength == 0 ? parseInt(Math.random() * MAX_STR) + parseInt((MAX_STR / 3) * 2) : strength,
    charisma: charisma == 0 ? parseInt(Math.random() * MAX_CHA) + parseInt((MAX_CHA / 3) * 2) : charisma
  }
  // The position of the worm on canvas. It's used to render the object on canvas
  // and to check for colisions
  const pos = {
    x: parseInt(Math.random() * 300),
    y: parseInt(Math.random() * 150),
    orientation: 'left'
  }
  const toString = () => '('.concat(pos.x).concat(', ').concat(pos.y).concat(') UNIQUE: ').concat(uniqueName)

  return { gender, attr, pos, uniqueName, toString }
}
// Function to generate a random orientation so the worms can move on the canvas.
const orientation = () => ['up', 'down', 'left', 'right'][parseInt((Math.random() * 100) / 25)]

/*
  This function will apply the randomly generated orientation on a worm. Incrementing or decrementing
  it's x or y axis on canvas.
*/
const applyNewOrientation = (worm) => {
  const pos = worm.pos
  switch(orientation()){
    case 'up':
      return { ...worm, pos: { ...pos, y: pos.y + 1, orientation: 'up'}}
    case 'down':
      return { ...worm, pos: { ...pos, y: pos.y - 1, orientation: 'down'}}
    case 'left':
      return { ...worm, pos: { ...pos, x: pos.x - 1, orientation: 'left'}}
    case 'right':
      return { ...worm, pos: { ...pos, x: pos.x + 1, orientation: 'right'}}
    default:
      return worm
  }
}

/*
  Function that takes two worms and generate a combination of the best assets
  of them.
*/
const generateWorm = (w1, w2) => {
  const bestStrength = w1.attr.strength > w2.attr.strength ? w1 : w2
  const bestCharisma = w1.attr.charisma > w2.attr.charisma ? w1 : w2
  return Worm(bestStrength, bestCharisma)
}
// Function responsible for check who wins in a fight between two worms of the same gender
const fight = (w1, w2) => {
  const w1Value = (w1.attr.strength + (Math.random() * w1.strength))
  const w2Value = (w2.attr.strength + (Math.random() * w2.strength))
  return w1Value > w2Value ? w2 : w1
}
/*
  Function responsible for checking if two worms match with each other. The parameter chosen
  is that, if the difference between their charismas is higher than 50%, they will not match.
*/
const match = (w1, w2) => {
  const w1Char = w1.attr.charisma, w2Char = w2.attr.charisma
  const percentageDifference = ( Math.abs(w1Char - w2Char) / ((w1Char + w2Char)/2) ) * 100
  return percentageDifference <= 50
}

// Check the x and y axis to see if two worms crashed with each other.
const checkCrash = (worm1, worm2) => {
  return  (worm1.pos.x === worm2.pos.x) ||
          (worm1.pos.x === worm2.pos.y) ||
          (worm1.pos.y === worm2.pos.x)
}

/*
  Find all the worms that have crashed while moving through the map.
  It returns an array of objects with two parameters: { w1, w2} that references
  the two worms that have crashed.
*/
const findCrashes = (worms) => {
  return worms.map(mapWorm => {
      const found = removeWorm(mapWorm, worms).filter(filterWorm => checkCrash(mapWorm, filterWorm))
      return found.length > 0 ? { w1: mapWorm, w2: found[0] } : null
    })
    .filter(worm => worm != null)
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


const worms = [...(new Array(20))].map(value => Worm())
const worms2 = resolveCrashes(uniqueCrashes(findCrashes(worms)), worms)
