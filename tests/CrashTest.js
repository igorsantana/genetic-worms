const assert     = require('assert')
const { checkCrash, findCrashes, uniqueCrashes } = require('../scripts/App/Crash')
const Worm = require('../scripts/Model/Worm')

describe('MODULE: Crashes', () => {
  const w1 = Worm()
  const w2 = Worm()
  const w3 = Worm()

  const createCrash = () => {
    w1.pos = { x: 1, y: 1, orientation: 'left', counter: 0 }
    w2.pos = { x: 1, y: 1, orientation: 'left', counter: 0 }
    w3.pos = { x: 2, y: 2, orientation: 'left', counter: 0 }
  }
  const removeCrash = () => {
    w1.pos = { x: 1, y: 1, orientation: 'left', counter: 0 }
    w2.pos = { x: 2, y: 2, orientation: 'left', counter: 0 }
    w3.pos = { x: 3, y: 3, orientation: 'left', counter: 0 }
  }

  describe('Function: checkCrash', () => {
    it('should return false if no parameters are given', () => {
      assert.equal(checkCrash(), false)
      assert.notEqual(checkCrash(), true)
    })

    it(`should return false if there's no crash`, () => {
      const pos1 = { x : 1, y : 1}
      const pos2 = { x : 2, y : 2}
      const pos3 = { x : 1, y:  2}
      const pos4 = { x : 5, y:  5}
      assert.equal(checkCrash(pos1, pos2), false)
      assert.equal(checkCrash(pos3, pos4), false)
    })

    it(`should return true if there's a crash between both x axis`, () => {
      const pos1 = { x: 1, y : 1 }
      const pos2 = { x: 1, y : 2 }
      assert.equal(checkCrash(pos1, pos2), true)
    })

    it(`should return true if there's a crash between both y axis`, () => {
      const pos1 = { x: 3, y : 2 }
      const pos2 = { x: 1, y : 2 }
      assert.equal(checkCrash(pos1, pos2), true)
    })

    it(`should return true if there's a crash between pos1.x and pos2.y axis`, () => {
      const pos1 = { x: 1, y : 3 }
      const pos2 = { x: 4, y : 1 }
      assert.equal(checkCrash(pos1, pos2), true)
    })

    it(`should return true if there's a crash between pos1.y and pos2.x axis`, () => {
      const pos1 = { x: 3, y : 1 }
      const pos2 = { x: 1, y : 4 }
      assert.equal(checkCrash(pos1, pos2), true)
    })

    it(`should return true if they are in the same position`, () => {
      const pos1 = { x: 1, y : 1 }
      const pos2 = { x: 1, y : 1 }
      assert.equal(checkCrash(pos1, pos2), true)
    })
  })

  describe('Function: findCrashes', () => {


    it('Should find crashes if there are any', () => {
      createCrash()
      const crashes = findCrashes([w1, w2, w3])
      assert.equal(crashes.length, 2)
      assert.equal(crashes[0].w1.uniqueName, w1.uniqueName)
      assert.equal(crashes[0].w2.uniqueName, w2.uniqueName)
      assert.equal(crashes[1].w1.uniqueName, w2.uniqueName)
      assert.equal(crashes[1].w2.uniqueName, w1.uniqueName)
    })

    it('Should not find crashes if there arent any', () => {
      removeCrash()
      const crashes = findCrashes([w1, w2, w3])
      assert.equal(crashes.length, 0)
    })

    it('should return an empty array if is passed one', () => {
      assert.equal(findCrashes([]).length, 0)
    })
  })

  describe('Function: uniqueCrashes', () => {
    it('should remove all the duplicated values if there are any', () => {
      createCrash()
      const crashes = findCrashes([w1, w2, w3])
      assert.equal(crashes.length, 2)
      assert.equal(uniqueCrashes(crashes).length, 1)
    })
    it('should return the same array if it has no duplicated values', () => {
      const crashes = uniqueCrashes(findCrashes([w1, w2, w3]))
      const crashesAfterUniq = uniqueCrashes(crashes)
      assert.equal(crashesAfterUniq.length, 1)
      assert.equal(crashesAfterUniq[0].w1.uniqueName, crashes[0].w1.uniqueName)
      assert.equal(crashesAfterUniq[0].w2.uniqueName, crashes[0].w2.uniqueName)
    })

    it('should return an empty array if is passed one', () => {
      assert.equal(uniqueCrashes([]).length, 0)
    })
  })

})
