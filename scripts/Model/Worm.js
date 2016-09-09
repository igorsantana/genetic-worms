/*
  The worm object. You can initialize it with custom strength and charisma like in the generation process.
  But you can also generate a new Worm without initialize the values, and i'm thinking in using this as a form
  of mutation.
*/

const Worm = (strength = 0, charisma = 0) => {
  const gender      = parseInt(Math.random() * 10) < 5 ? 'MALE' : 'FEMALE'
  const uniqueName  = require('uuid').v1()
  const { STR, CHA } = require('../App/MaximumValues')().getValues()

  const attr  = {
    strength: strength == 0 ? parseInt(Math.random() * STR) + parseInt((STR / 3) * 2) : strength,
    charisma: charisma == 0 ? parseInt(Math.random() * CHA) + parseInt((CHA / 3) * 2) : charisma
  }
  // The position of the worm. It's used to render the object on canvas and to check for colisions
  const pos = {
    x: parseInt(Math.random() * 300),
    y: parseInt(Math.random() * 150),
    orientation: 'left',
    counter: 0
  }
  const toString = () => '('.concat(pos.x).concat(', ').concat(pos.y).concat(') UNIQUE: ').concat(uniqueName)

  return { gender, attr, pos, uniqueName, toString }
}


module.exports = Worm
