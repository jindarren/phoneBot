var express = require('express');
var router = express.Router();
var recom = require('./recommender');
var passport = require('passport');
var SpotifyStrategy = require('../node_modules/passport-spotify/lib/passport-spotify/index').Strategy;
var request = require('request');
var User = require('../public/model/user');
var franc = require('franc-min') //for language detection
var pinyin = require("pinyin");
var genreData = require('../public/js/genre-data');

var avaGenres = genreData

var appKey = 'a1d9f15f6ba54ef5aea0c5c4e19c0d2c',
appSecret = 'b368bdb3003747ec861e62d3bf381ba0';

    // Passport session setup.
    //   To support persistent login sessions, Passport needs to be able to
    //   serialize users into and deserialize users out of the session. Typically,
    //   this will be as simple as storing the user ID when serializing, and finding
    //   the user by ID when deserializing. However, since this example does not
    //   have a database of user records, the complete spotify profile is serialized
    //   and deserialized.
passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});


// Use the SpotifyStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and spotify
//   profile), and invoke a callback with a user object.


router.post("/addRecord", function(req, res) {

    var user = new User(req.body);

    //save a new user
    user.save(function(err) {
        if (err)
            res.send(err)
        else
            res.json({status:"success"})
    })

});

router.get("/findRecord", function(req, res) {
    var user = new User();
    var id = req.query.id
    user.find({"id": id},function (data) {
        res.json(data)
    })
});


router.post("/updateRecord", function(req, res) {
    var updatedID = req.body.id
    var que3List = req.body.que3
    var updatedTimestamp = new Date()
    User.updateOne({"id":updatedID},{$set:{que3:que3List,timestamp:updatedTimestamp}},function(err){
        if (err)
            res.send(err)
        else
            res.json({status:"success"})
    })

});


router.get("/getRecord", function(req, res) {
    User.find({}, function(err, user) {
        if (err)
            res.json(err);
        else {
            res.json(user)
        }
    })
});


router.get('/index', function(req, res) {
    res.render('index', {
        data: req.user
    })
})

router.get('/preference', function(req, res) {
    res.render("preference")
});


router.get('/intro', function(req, res) {
    res.render("intro")
});

router.get('/intro-en', function(req, res) {
    res.render("intro-en")
});

router.get('/success', function(req, res) {
    res.render("success")
});

router.get('/success2', function(req, res) {
    res.render("success2")
});

router.get('/tip', function(req, res) {
    res.render("tip10")
});

router.get('/index-base', function(req, res) {
    res.render('index-base', {
        data: req.user
    })
})

router.get('/que1', function(req, res) {
    res.render("que1")
});

router.get('/que2', function(req, res) {
    res.render("que2")
});

router.get('/que3', function(req, res) {
    res.render("que3")
});



//-------------------------------python backend--------------------------------//


router.post('/initialize_user_model',function (req,res) {
    console.log(req.body)
    request.post({url:'http://127.0.0.1:5000/initialize_user_model',
        json: req.body}, (error, response, body) => {
        if (error) {
            console.error(error)
            return
        }
        res.json(body)
    })
})

router.post('/update_user_model',function (req,res) {
    console.log(req.body)
    request.post({url:'http://127.0.0.1:5000/update_user_model',
        json: req.body}, (error, response, body) => {
        if (error) {
            console.error(error)
            return
        }
        res.json(body)
    })
})

router.post('/get_rec',function (req,res) {
    console.log(req.body)
    request.post({url:'http://127.0.0.1:5000/get_rec',
        json: req.body}, (error, response, body) => {
        if (error) {
            console.error(error)
            return
        }
        res.json(body)
    })
})

router.post('/get_sys_cri',function (req,res) {
    console.log(req.body)
    request.post({url:'http://127.0.0.1:5000/get_sys_cri',
        json: req.body}, (error, response, body) => {
        if (error) {
            console.error(error)
            return
        }
        res.json(body)
    })
})


router.post('/trigger_sys_cri',function (req,res) {
    console.log(req.body)
    request.post({url:'http://127.0.0.1:5000/trigger_sys_cri',
        json: req.body}, (error, response, body) => {
        if (error) {
            console.error(error)
            return
        }
        res.json(body)
    })
})



//-------------------------------system critiquing--------------------------------//

// const fs = require('fs');
// const csv = require('csv-parser');
const sysCritique = require('./systemProposedCritiques.js');
const _ = require('lodash');

class UserData {
    constructor(id, preferenceData, preferenceData_max, preferenceData_min, attributeWeight, preferenceData_variance) {
        this.id = id;
        this.preferenceData = preferenceData;
        this.preferenceData_max = preferenceData_max; // for audio features
        this.preferenceData_min = preferenceData_min; // for audio features
        this.attributeWeight = attributeWeight;
        this.preferenceData_variance = preferenceData_variance;
    }
};

// Item attributes 
let numericalAttributes = ['popularity', 'danceability', 'energy', 'speechiness', 'tempo', 'valence'];
let nominalAttributes = ['artist', 'genre', 'language'];
// let attributes = numericalAttributes.concat(nominalAttributes);



var generateCritiquing = function(data) {
    var user = data.user
    var playlist = data.playlist

    let preferenceData = {
        'artist': user.preferenceData.artist,
        'genre': user.preferenceData.genre,
        'language': user.preferenceData.language,
        'popularity': user.preferenceData.popularity,
        'danceability': user.preferenceData.danceability,
        'energy': user.preferenceData.energy,
        'speechiness': user.preferenceData.speechiness,
        'tempo': user.preferenceData.tempo,
        'valence':  user.preferenceData.valence
    };

    var totalWeight = user.attributeWeight.artistWeight+user.attributeWeight.genreWeight+user.attributeWeight.languageWeight+
    user.attributeWeight.popularityWeight+user.attributeWeight.danceabilityWeight+user.attributeWeight.energyWeight+user.attributeWeight.speechinessWeight+
    user.attributeWeight.tempoWeight+user.attributeWeight.valenceWeight;
    if(totalWeight==0)
        totalWeight=1
    let attributeWeight = {
        'artist': user.attributeWeight.artistWeight/totalWeight,
        'genre': user.attributeWeight.genreWeight/totalWeight,
        'language': user.attributeWeight.languageWeight/totalWeight,
        'popularity': user.attributeWeight.popularityWeight/totalWeight,
        'danceability': user.attributeWeight.danceabilityWeight/totalWeight,
        'energy': user.attributeWeight.energyWeight/totalWeight,
        'speechiness': user.attributeWeight.speechinessWeight/totalWeight,
        'tempo': user.attributeWeight.tempoWeight/totalWeight,
        'valence': user.attributeWeight.valenceWeight/totalWeight
    };

    let preferenceData_max = { 'popularity': 100, 'danceability': user.preferenceData.danceabilityRange[1], 'energy':user.preferenceData.energyRange[1], 'speechiness':user.preferenceData.speechinessRange[1], 
'tempo':user.preferenceData.tempoRange[1], 'valence':user.preferenceData.valenceRange[1]};
    let preferenceData_min = { 'popularity': 0, 'danceability': user.preferenceData.danceabilityRange[0], 'energy':user.preferenceData.energyRange[0], 'speechiness':user.preferenceData.speechinessRange[0], 
'tempo':user.preferenceData.tempoRange[0], 'valence':user.preferenceData.valenceRange[0]};

//     let preferenceData_max = { 'popularity': 100, 'danceability': user.preferenceData.danceability+user.preferenceData_variance.danceability, 'energy':user.preferenceData.energy+user.preferenceData_variance.energy, 'speechiness':user.preferenceData.speechiness+user.preferenceData_variance.speechiness, 
// 'tempo':user.preferenceData.tempo+user.preferenceData_variance.tempo, 'valence':user.preferenceData_variance.valence+user.preferenceData_variance.valence};
//     let preferenceData_min = { 'popularity': 0, 'danceability': user.preferenceData.danceability-user.preferenceData_variance.danceability, 'energy':user.preferenceData.energy-user.preferenceData_variance.energy, 'speechiness':user.preferenceData.speechiness-user.preferenceData_variance.speechiness, 
// 'tempo':user.preferenceData.tempo-user.preferenceData_variance.tempo, 'valence':user.preferenceData_variance.valence-user.preferenceData_variance.valence};
    let userdata = new UserData(user.id, preferenceData, preferenceData_max, preferenceData_min, attributeWeight, user.preferenceData_variance);

    console.log("------------------------------------------------");
    console.log("Total Item Data: " + playlist.length + " records");
    console.log("Read Music Data Finished!");
    console.log("------------------------------------------------");

    // Step 1: Find a top recommended item using Spotify API
    // Suppose top recommended item 
    let topRecItem = data.topRecommendedSong


    // Step 2: Produce critiques using Apriori algorithm and select the most favorite critique with higher tradeoff utility

    start = new Date().getTime();
    // control parameter
    let numfCompoundCritiques = [2, 3];
    let supportValue = 0.1;
    // let numOfUtilityCritiques = 3;
    let numOfDiversifiedCritiques = 10; // the number of items that satisfy favorite critique and that will be presented
    // let numOfReturnCritiques = 10;
    // user.preferenceData_variance = preferenceData_variance
    // get favor critique and diversified critique 
    let systemCritiquing = sysCritique(userdata, playlist, topRecItem, nominalAttributes, numericalAttributes, numfCompoundCritiques,
        supportValue, numOfDiversifiedCritiques);

    end = new Date().getTime();
    console.log("------------------------------------------------");
    console.log('-----Execution time: ' + (end - start) + 'ms.');
    console.log("------------------------------------------------");

    console.log("diversify critique: ");
    console.log(systemCritiquing.diversifyCritique);


    return systemCritiquing;
}

router.post("/generateCritiquing", function(req, res) {

    if (req.query.id) {
        var critique = generateCritiquing(req.body)
        res.json(critique)
    }
});

module.exports = router;