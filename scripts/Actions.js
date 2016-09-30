
const actionCreator = () => {
  const move      = (id = '', index = 0)          => ({ type: 'MOVE_WORM', id, index })
  const kill      = (id = '')                     => ({ type: 'KILL_WORM', id })
  const generate  = (parent1 = {}, parent2 = {})  => ({ type: 'GENERATE_WORM', parent1, parent2 })
  const log       = ()                            => ({ type: 'APPEND_LOG' })
  const ranking   = ()                            => ({ type: 'UPDATE_RANKING' })

  return Object.create({ move, kill, generate, log, ranking })
}



module.exports = actionCreator()
