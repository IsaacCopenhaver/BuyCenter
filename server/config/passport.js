import bcrypt from 'bcrypt'
import { Strategy as LocalStrategy } from 'passport-local'
import User from '../models/User.js'

function initializePassport(passport) {
    const authenticateUser = async (email, password, done) => {
        try {
            const user = await User.findOne({ where: { email } })
            if (!user) {
                return done(null, false, { message: 'No user with that email' })
            }
            const isMatch = await bcrypt.compare(password, user.passwordHash)
            if (!isMatch) {
                return done(null, false, { message: 'Password incorrect' })
            }
            return done(null, user)
        } catch (error) {
            return done(error)
        }
    }

    passport.use(new LocalStrategy({ usernameField: 'email' }, authenticateUser))

    passport.serializeUser((user, done) => {
        done(null, user.id)
    })

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findByPk(id)
            done(null, user || false)
        } catch (error) {
            done(error)
        }
    })

}

export { initializePassport }