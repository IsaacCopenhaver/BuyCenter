import Game from './Game.js'
import CardSet from './CardSet.js'
import Card from './Card.js'
import Grading from './Grading.js'

// One game has many sets
Game.hasMany(CardSet, { foreignKey: 'gameId' })
CardSet.belongsTo(Game, { foreignKey: 'gameId' })

// One set has many cards
CardSet.hasMany(Card, { foreignKey: 'setId' })
Card.belongsTo(CardSet, { foreignKey: 'setId' })

// One grading connects to exactly one card
Grading.hasOne(Card, { foreignKey: 'gradingId' })
Card.belongsTo(Grading, { foreignKey: 'gradingId' })

export { Game, CardSet, Card, Grading }
