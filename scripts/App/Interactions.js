const Worm = require('../Model/Worm')

/*
  Function that takes two worms and generate a combination of the best assets
  of them.
*/
const generateWorm = (w1, w2) => {
  const w1Attributes = w1.getAttributes()
  const w2Attributes = w2.getAttributes()

  const bestStrength = w1Attributes.strength > w2Attributes.strength ? w1 : w2
  const bestCharisma = w1Attributes.charisma > w2Attributes.charisma ? w1 : w2

  return Worm(bestStrength, bestCharisma)
}
// Function responsible for check who wins in a fight between two worms of the same gender
const fight = (w1, w2) => {
  const w1Attributes = w1.getAttributes()
  const w2Attributes = w2.getAttributes()

  const w1Value = (w1Attributes.strength + (Math.random() * w1Attributes.strength))
  const w2Value = (w2Attributes.strength + (Math.random() * w2Attributes.strength))
  return w1Value > w2Value ? w2 : w1
}

/*
  Function responsible for checking if two worms match with each other. The parameter chosen
  is that, if the difference between their charismas is higher than 50%, they will not match.
*/
const match = (w1, w2) => {
  const w1Char = w1.getAttributes().charisma,
        w2Char = w2.getAttributes().charisma

  const percentageDifference = ( Math.abs(w1Char - w2Char) / ((w1Char + w2Char)/2) ) * 100
  return percentageDifference <= 50
}

module.exports = { generateWorm, fight, match }
