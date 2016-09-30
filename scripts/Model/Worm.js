/*
  The worm object. You can initialize it with custom strength and charisma like in the generation process.
  But you can also generate a new Worm without initialize the values, and i'm thinking in using this as a form
  of mutation.
*/

const chance  = require('chance')()
const uuid    = require('uuid')

function updatePosition(x, y, width, height){
  this.pos = Object.assign({}, this.pos, { x, y, width, height })
}

function toString(){
  return 'Gender: ' + this.gender + ' ('.concat(this.pos.x).concat(', ').concat(this.pos.y).concat(') ID: ').concat(this.name)
}

function getAttributes(){
  return this.attr
}

const WormFactory = (strength = 0, charisma = 0) => {
  const { STR, CHA } = require('../App/MaximumValues')().getValues()

  const proto = { updatePosition, toString, getAttributes }
  const gender = parseInt(Math.random() * 10) < 5 ? 'male' : 'female'
  let Worm = {
    gender: gender.toUpperCase(),
    name:   chance.name({ gender }),
    id:     uuid.v1(),
    attr:   {
      strength: strength == 0 ? parseInt(Math.random() * STR) + parseInt((STR / 3) * 2) : strength,
      charisma: charisma == 0 ? parseInt(Math.random() * CHA) + parseInt((CHA / 3) * 2) : charisma
    },
    pos:    {
      x: parseInt(Math.random() * 600),
      y: parseInt(Math.random() * 600),
      width: 30,
      height: 7.5
    }
  }
  Object.setPrototypeOf(Worm, proto)
  return Worm
}

module.exports = WormFactory
