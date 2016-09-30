const findCollisions = (worms) => {
  const collisions =
    worms.map(refWorm => {
      return worms.filter(wf => wf.id != refWorm.id && collisionCheckWormWorm(wf, refWorm))
                  .map(wm => ({ w1: wm, w2: refWorm}))[0]
    })
    .filter(col => !!col) // Removes undefined values
    .filter((_, i) => i%2 == 0)

  return collisions
}



function collisionCheckWormWorm(worm1, worm2){
    var x1=worm1.pos.x, y1 = worm1.pos.y, height1 = worm1.pos.height, width1 = worm1.pos.width;
    var x2=worm2.pos.x, y2 = worm2.pos.y, height2 = worm2.pos.height, width2 = worm2.pos.width;
    return x1 < x2+width2 && x2 < x1+width1 && y1 < y2+height2 && y2 < y1+height1;
}

module.exports = { findCollisions }
