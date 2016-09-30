
const { createStore, combineReducers }  = require('redux')
const { worms, logs, ranking }          = require('./Reducers')
const Actions                           = require('./Actions')
const { findCollisions }                = require('./App/Crash')
const { generateWorm, fight, match }    = require('./App/Interactions')

// Redux Initialization
const rootReducer = combineReducers({ worms, logs, ranking })
const appStore    = createStore(rootReducer)


const collisionSolver = (collision) => {
  if(collision.w1.gender === collision.w2.gender){
    const loser = fight(collision.w1, collision.w2)

    appStore.dispatch(Actions.kill(loser.id))
    return
  }
  if(match(collision.w1, collision.w2)){

    appStore.dispatch(Actions.generate(collision.w1, collision.w2))
  }
}

// Main Application Loop with Redux State
let state

const mainApp = () => {
// ---------- COLLISIONS WORMS ----------- //
  state = appStore.getState()
  findCollisions(state.worms).forEach(collisionSolver)
// --------------------------------------- //

// ------------- MOVE WORMS -------------- //
  state = appStore.getState()
  state.worms.forEach((worm, index) => appStore.dispatch(Actions.move(worm.id, index)))
// --------------------------------------- //
}




setInterval(_ => mainApp(), 300)












// canvasContext.clearRect(0, 0, 600, 600)
// const worms =
// moveWorms(worms).forEach(worm => canvasContext.fillRect(worm.pos.x, worm.pos.y, worm.pos.width, worm.pos.height))
// const canvasContext                     = document.getElementById('wormsPlayground').getContext('2d')
