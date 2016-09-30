
const randomOrientation = () => ['up', 'down', 'left', 'right'][parseInt((Math.random() * 100) / 25)]

// updatePos parameters
// x, y, orientation, width, height


const moveWorm = (worm) => {
  const orientation = randomOrientation()
  switch(orientation){
    case 'up':
      worm.updatePosition(worm.pos.x, worm.pos.y - 1, 7.5, 30)
    case 'down':
      worm.updatePosition(worm.pos.x, worm.pos.y + 1, 7.5, 30)
    case 'left':
      worm.updatePosition(worm.pos.x - 1, worm.pos.y, 7.5, 30)
    case 'right':
      worm.updatePosition(worm.pos.x + 1, worm.pos.y, 7.5, 30)
  }
  return worm
}


module.exports = { moveWorm }
