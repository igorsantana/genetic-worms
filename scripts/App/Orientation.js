/*
  This function will apply the randomly generated orientation on a worm.
  Incrementing or decrementing it's x or y axis on canvas.
*/

const applyAxisChange = (orientation, worm) => {
  const pos = worm.pos
  switch(orientation){
    case 'up':
      return { ...worm, pos: { ...pos, y: pos.y + 1, orientation: 'up' }}
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


const applyNewOrientation = (worm) => {
  const orientation = () => ['up', 'down', 'left', 'right'][parseInt((Math.random() * 100) / 25)]

  if(worm.pos.counter < 3) {
    const newWorm = applyAxisChange(worm.pos.orientation, worm)
    return { ...newWorm, pos: { ...newWorm.pos, counter: worm.pos.counter + 1 }}
  }
  const newWorm = applyAxisChange(orientation(), worm)
  return {... newWorm, pos: { ...newWorm.pos, counter: 1 }}

}

const moveWorms = (worms) => worms.map(worm => applyNewOrientation(worm))

module.exports = { applyNewOrientation, moveWorms }
