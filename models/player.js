module.exports = function(sequelize, DataTypes) {
    var Player = sequelize.define("Player", {
      // Giving the Player model a name of type STRING
      player_name: {
         type: DataTypes.STRING,
         allowNull: false,
        },
      highest_score:{
          type: DataTypes.INTEGER,
          allowNull: true,

      }

    });
    
    return Player;
  };
  