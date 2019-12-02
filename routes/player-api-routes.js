var db = require("../models");

module.exports = function(app) {
  // Find all players and return them to the user with res.json
  app.get("/api/players", function(req, res) {
    db.Player.findAll({}).then(function(dbPlayer
        ) {
      res.json(dbPlayer
        );
    });
  });

  app.get("/api/players/:id", function(req, res) {
    // Find one Player with the id in req.params.id and return them to the user with res.json
    db.Player.findOne({
      where: {
        id: req.params.id
      }
    }).then(function(dbPlayer
        ) {
      res.json(dbPlayer
        );
    });
  });

  app.post("/api/players", function(req, res) {
    // Create an Player with the data available to us in req.body
    db.Player.create(req.body).then(function(dbPlayer) {
      res.json(dbPlayer);
      console.log("API connect with " + req.body.player_name);
    });
  });

  app.delete("/api/players/:id", function(req, res) {
    // Delete the Player with the id available to us in req.params.id
    db.Player.destroy({
      where: {
        id: req.params.id
      }
    }).then(function(dbPlayer
        ) {
      res.json(dbPlayer
        );
    });
  });

};
