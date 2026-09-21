// Session gate for the API. `req.isAuthenticated()` comes from Passport and is
// available because `passport.session()` is mounted before the routes.
//
// 401 with an { error } body is the shape the client already expects: the
// AuthContext reads `error` off any failed response, and treats a 401 from
// /api/auth/me as the normal "nobody is signed in" answer rather than a
// failure.
export function requireAuth(req, res, next) {
    if (!req.isAuthenticated()) {
        return res.status(401).json({
            error: 'Not authenticated'
        })
    }

    next()
}
