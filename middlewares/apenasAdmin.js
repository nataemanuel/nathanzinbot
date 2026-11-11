
function apenasAdmin(req, res, next) {

    if (req.usuario && req.usuario.role === "admin") {
        return next();
    }

    return res.status(403).json({
        error: "Acesso proibido. Apenas administradores podem acessar este recurso."
    });

}

module.exports = apenasAdmin;
