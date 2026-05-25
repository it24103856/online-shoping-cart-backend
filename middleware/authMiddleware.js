export const protect=(req,res,next)=>{
    if(req.user){
        return next();
    }else{
        return res.status(401).json({message:"Unauthorized"})
    }
}

// is admin middleware

export const isAdmin=(req,res,next)=>{
    const userIsAdmin = Boolean(req.user && req.user.role === "admin");

    // Keep compatibility with existing places that call isAdmin(req, res)
    // as a predicate instead of Express middleware.
    if (typeof next !== "function") {
        return userIsAdmin;
    }

    if(userIsAdmin){
        return next();
    }

    return res.status(403).json({message:"Forbidden"})
}