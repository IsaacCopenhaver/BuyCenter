import User from './User.js'
import Game from './Game.js'
import CardSet from './CardSet.js'
import Card from './Card.js'
import Grading from './Grading.js'
import Cart from './Cart.js'
import Customer from './Customer.js'
import CartItem from './CartItem.js'
import BuyTransaction from './BuyTransaction.js'

// One game has many sets
Game.hasMany(CardSet, { foreignKey: 'gameId' })
CardSet.belongsTo(Game, { foreignKey: 'gameId' })

// One set has many cards
CardSet.hasMany(Card, { foreignKey: 'setId' })
Card.belongsTo(CardSet, { foreignKey: 'setId' })

// One grading connects to exactly one card
Grading.hasOne(Card, { foreignKey: 'gradingId' })
Card.belongsTo(Grading, { foreignKey: 'gradingId' })

// One customer can have many carts
Customer.hasMany(Cart, { foreignKey: 'customerId' })
Cart.belongsTo(Customer, { foreignKey: 'customerId' })

// One cart has many cart items
Cart.hasMany(CartItem, { foreignKey: 'cartId' })
CartItem.belongsTo(Cart, { foreignKey: 'cartId' })

// One card can appear in many cart items
Card.hasMany(CartItem, { foreignKey: 'cardId' })
CartItem.belongsTo(Card, { foreignKey: 'cardId' })

// One cart can have many buyers, and one buyer can have many carts
User.belongsToMany(Cart, { 
  through: 'cart_buyers', 
  foreignKey: 'userId', 
  otherKey: 'cartId' 
});

Cart.belongsToMany(User, { 
  through: 'cart_buyers', 
  foreignKey: 'cartId', 
  otherKey: 'userId',
  as: 'buyers',
});

// One customer can have many buy transactions
Customer.hasMany(BuyTransaction, { foreignKey: 'customerId' })
BuyTransaction.belongsTo(Customer, { foreignKey: 'customerId' })

// A cart is checked out at most once
Cart.hasOne(BuyTransaction, { foreignKey: 'cartId' })
BuyTransaction.belongsTo(Cart, { foreignKey: 'cartId' })

// One user can complete many buy transactions
User.hasMany(BuyTransaction, { foreignKey: 'completedById' })
BuyTransaction.belongsTo(User, {
    foreignKey: 'completedById',
    as: 'completedBy',
})

export { User, Game, CardSet, Card, Grading, Cart, Customer, CartItem, BuyTransaction }
