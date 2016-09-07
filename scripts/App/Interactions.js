const Worm = require('../Model/Worm')

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

module.exports = { generateWorm, fight, match }
