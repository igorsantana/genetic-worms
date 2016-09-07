/*
  This function will apply the randomly generated orientation on a worm.
  Incrementing or decrementing it's x or y axis on canvas.
*/
const applyNewOrientation = (worm) => {
  const orientation = () => ['up', 'down', 'left', 'right'][parseInt((Math.random() * 100) / 25)]
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

module.exports = applyNewOrientation
