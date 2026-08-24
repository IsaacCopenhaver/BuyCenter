import passport from 'passport'

export function login (req, res, next) {
  passport.authenticate('local', (err, user) => {
    if (err) {
      return next(err)
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    req.logIn(user, (err) => {
      if (err) {
        return next(err)
      }
        return res.json({ 
            id: user.id, 
            email: user.email
        })
    })
  })(req, res, next)
}

export function me(req, res) {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ 
            error: 'Not authenticated' 
        })
    }

    res.json({ 
        id: req.user.id, 
        email: req.user.email
    })
}

export function logout (req, res, next) {
    req.logout((err) => {
        if (err) {
      return next(err)
        }
        req.session.destroy((sessionError) => {
            if (sessionError) { 
                return next(sessionError)
            }

            res.sendStatus(204)
        })
    })
} 