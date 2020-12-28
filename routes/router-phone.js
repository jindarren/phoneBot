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
passport.use(new SpotifyStrategy({
        clientID: appKey,
        clientSecret: appSecret,
        callbackURL: 'http://music-bot.top:3000/callback'
        // callbackURL: 'http://localhost:3000/callback'
    },
    function(accessToken, refreshToken, profile, done) {
        // asynchronous verification, for effect...

        process.nextTick(function() {
            // To keep the example simple, the user's spotify profile is returned to
            // represent the logged-in user. In a typical application, you would want
            // to associate the spotify account with a user record in your database,
            // and return that user instead.
            return done(null, profile, {
                accessToken: accessToken,
                refreshToken: refreshToken
            });
        });

    }));

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


router.get('/preference-1', function(req, res) {
    res.render("preference-1")
});

router.get('/preference-2', function(req, res) {
    res.render("preference-2")
});

router.get('/preference-3', function(req, res) {
    res.render("preference-3")
});

router.get('/preference-4', function(req, res) {
    res.render("preference-4")
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

router.get('/topinyin', function(req, res) {
    var text = req.query.text
    var result = pinyin(text, {style: pinyin.STYLE_NORMAL})
    var voice = ""
    for (var word in result){
        voice += result[word]+ " "
    }
    res.json({pinyin: voice})
})

router.get('/logout', function(req, res) {
    req.logout();
    res.redirect("/")
});

/*
 route for web API
 */

router.get('/searchTrack', function(req, res) {
    var result = {}
    var token = req.query.token
    recom(token).searchTrack(req.query.q).then(function(data) {
        getAudioFeatures(token, data.tracks.items).then(function(data2) {
            result.tracks = data2;
            res.json(result)
        })
    })
})

router.get('/searchOnlyTrack', function(req, res) {
    var token = req.query.token
    recom(token).searchTrack(req.query.q).then(function(data) {
        res.json(data)
    })
})

router.get('/searchArtist', function(req, res) {
    var result = {}
    var token = req.query.token
    recom(token).searchArtist(req.query.q).then(function(data) {
        recom(token).getArtistTopTracks(data.artists.items[0].id, "SE").then(function(data2) {
            getAudioFeatures(token, data2.tracks).then(function(data3) {
                result.tracks = data3;
                res.json(result)
            })
        })
    })
})

router.get('/searchOnlyArtist', function(req, res) {
    var token = req.query.token
    recom(token).searchArtist(req.query.q).then(function(data) {
        res.json(data)
    })
})

router.get('/searchPlaylist', function(req, res) {
    var result = {}
    var token = req.query.token
    recom(token).searchPlaylist(req.query.q).then(function(data) {
        var lang;
        if (req.query.q == "english songs")
            lang = "English"
        else if (req.query.q == "spainish songs")
            lang = "Spainish"
        else if (req.query.q == "japanese songs")
            lang = "Japanese"
        else if (req.query.q == "korean songs")
            lang = "Korean"
        else if (req.query.q == "chinese songs")
            lang = "Chinese"
        else if (req.query.q == "hong kong songs")
            lang = "Cantonese"
        else if (req.query.q == "german songs")
            lang = "German"
        else if (req.query.q == "french songs")
            lang = "French"
        else if (req.query.q == "russian songs")
            lang = "Russian"
        else if (req.query.q == "portuguese songs")
            lang = "Portuguese"
        else if (req.query.q == "italian songs")
            lang = "Italian"

        recom(token).getPlaylistTracks(data.playlists.items[0].id).then(function(data2) {
            var tracks = [];

            for (var index in data2.items) {
                data2.items[index].track.language = lang
                if (data2.items[index].track.id)
                    tracks.push(data2.items[index].track)
            }
            if(tracks.length>50)
                tracks = tracks.slice(0,50)
            getAudioFeatures(token, tracks).then(function(data3) {
                result.tracks = data3;
                res.json(result)
            })
        })
    })
})

router.get('/searchPlaylistByCategory', function(req, res) {
    var result = {}
    var token = req.query.token
    recom(token).getPlaylistByCategory(req.query.genre).then(function(data, err) {
        if (err){
            res.json(err)
        }else{
            recom(token).getPlaylistTracks(data.playlists.items[0].id).then(function(data2) {
                var tracks = [];
                for (var index in data2.items) {
                    if (data2.items[index].track.id)
                        tracks.push(data2.items[index].track)
                }
                getAudioFeatures(token, tracks).then(function(data3) {
                    result.tracks = data3;
                    res.json(result)
                })
            })
        }
    })
})


router.get('/getArtist', function(req, res) {
    var result = {}
    recom(req.query.token).getTopArtists().then(function(data) {
        result.items = data;
        res.json(result)
    })
})

router.get('/getTrack', function(req, res) {
    var result = {}
    recom(req.query.token).getTopTracks().then(function(data) {
        result.items = data;
        res.json(result)
    })
})

router.get('/getGenre', function(req, res) {
    var result = {}
    recom(req.query.token).getTopGenres().then(function(data) {
        result.items = data;
        res.json(result)
    })
})


router.get('/getRecom', function(req, res) {
    var result = {}
    var token = req.query.token
    recom(token).getRecommendation(req.query.artistSeeds, req.query.trackSeeds, req.query.genreSeeds, 
        req.query.min_valence, req.query.target_valence, req.query.max_valence, 
        req.query.min_tempo, req.query.target_tempo, req.query.max_tempo, 
        req.query.min_energy, req.query.max_energy,
        req.query.min_danceability, req.query.max_danceability,
        req.query.min_speechiness, req.query.max_speechiness,
        req.query.min_popularity, req.query.max_popularity).then(function(data) {
        getAudioFeatures(token, data).then(function(data2) {
            result.tracks = data2;
            res.json(result)
        })
    })
})

router.get('/getRecomByFollowSimilar', function(req, res) {
    var result = {}
    recom(req.query.token).getArtistRelatedArtists(req.query.id).then(function(data) {
        var selectedRelated = data.slice(0, 5);
        result.similar = selectedRelated
        return selectedRelated
    }).then(function(data) {
        recom(req.query.token).getRecommendationByFollowedArtist(data, 'US').then(function(data) {
            result.items = data
            res.json(result)
        })
    })
})

router.get('/getAccount', function(req, res) {
    recom(req.query.token).getRecommendationByGenre().then(function(data) {
        res.json(data)
    })
})


var getAudioFeatures = function(token, data) {
    var artistIds = [],
        trackIds = [],
        visData = [];
    if(data.length>0){
        for (var index in data) {
            var oneRecommendation = {};
            oneRecommendation.id = data[index].id;
            oneRecommendation.name = data[index].name;
            if (!data[index].lan){
                var lang = franc(oneRecommendation.name, {
                    whitelist: ['cmn', 'eng', 'jpn', 'kor'],
                    minLength: 1
                })
                if(lang == 'cmn')
                    oneRecommendation.language = "Chinese"
                else if(lang == 'eng')
                    oneRecommendation.language = "English"
                else if(lang == 'jpn')
                    oneRecommendation.language = "Japanese"
                else if(lang == 'kor')
                    oneRecommendation.language = "Korean"
            }
            else {
                oneRecommendation.language = data[index].lan;
            }
            if(data[index].popularity)
                oneRecommendation.popularity = data[index].popularity;
            else
                oneRecommendation.popularity = 0;
            if(data[index].artists){
                oneRecommendation.artist = data[index].artists[0].name;
            }
            else{
                data.splice(index,1)
                continue
            }

            if(data[index].preview_url)
                oneRecommendation.link = data[index].preview_url;
            else
                oneRecommendation.link = "unknown"
            visData.push(oneRecommendation)
            artistIds.push(data[index].artists[0].id)
            trackIds.push(oneRecommendation.id)

        }

        return recom(token).getAudioFeatures(trackIds).then(function(data) {
            for (var index in data.audio_features) {
                //console.log(data.audio_features[index])
                visData[index].danceability = data.audio_features[index].danceability;
                visData[index].energy = data.audio_features[index].energy;
                visData[index].speechiness = data.audio_features[index].speechiness;
                visData[index].tempo = data.audio_features[index].tempo;
                visData[index].valence = data.audio_features[index].valence;
            }

            // return recom(token).getGenresForArtists(artistIds.slice(0,50)).then(function(data2) {
            //     for (var index in data2.artists) {
            //         visData[index].genre = data2.artists[index].genres[0]
            //     }
            //     return recom(token).getGenresForArtists(artistIds.slice(50,100)).then(function(data3) {
            //         for (var index in data3.artists) {
            //             visData[50+index].genre = data3.artists[index].genres[0]
            //         }
            //     }).then(function() {
            //         return visData
            //     }, function(err) {
            //         return err;
            //     })
            // })
            return recom(token).getGenresForArtists(artistIds).then(function(data2) {
                for (var index in data2.artists) {

                    var genre = data2.artists[index].genres[0]
                    if(genre==undefined){
                        genre = "niche"
                    }

                    if(genre.indexOf("pop")>=0)
                        genre = "pop"
                    else if(genre.indexOf("rock")>=0)
                        genre = "rock"
                    else if(genre.indexOf("hip hop")>=0)
                        genre = "hip hop"
                    else if(genre.indexOf("dance")>=0)
                        genre = "dance"
                    else if(genre.indexOf("funk")>=0)
                        genre = "funk"

                    visData[index].genre = genre

                }
            }).then(function() {
                return visData
            }, function(err) {
                return err;
            })
        })
    }else{
        console.log(data)
    }

}

var getAverageFeatures = function(token, trackIds, artistIds){
    var tracks = trackIds,
        artists = artistIds,
        numOfTracks = tracks.length
        features = {};

    if(numOfTracks==0)
        numOfTracks=1

    return recom(token).getTracks(tracks).then(function(data0){
        features.popularity=0 
        for (var index in data0.tracks) {
            features.popularity += data0.tracks[index].popularity;
        }
        features.popularity = features.popularity/numOfTracks

        return recom(token).getAudioFeatures(tracks).then(function(data) {
        features.danceability=0
        features.energy=0
        features.speechiness=0
        features.tempo=0
        features.valence=0 
        features.genre=""

        for (var index in data.audio_features) {
            features.danceability += data.audio_features[index].danceability;
            features.energy += data.audio_features[index].energy;
            features.speechiness += data.audio_features[index].speechiness;
            features.tempo += data.audio_features[index].tempo;
            features.valence += data.audio_features[index].valence;
        }

        features.danceability = features.danceability/numOfTracks
        features.energy = features.energy/numOfTracks
        features.speechiness = features.speechiness/numOfTracks
        features.tempo = features.tempo/numOfTracks
        features.valence = features.valence/numOfTracks
        
    }).then(function() {
            return features
        }, function(err) {
            return err;
        })
    })
}

function uniqueArr(arr1, arr2){
    var arr3 = arr1.concat(arr2)
    var arr4 = []
    for(var i=0,len=arr3.length; i<len; i++) {
        if(arr4.indexOf(arr3[i]) === -1) {
            arr4.push(arr3[i])
        }
    }
    return arr4
}

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



router.post('/initiate', function(req, res) {
    //pass token to the webAPI used by recommender
    var userID = req.query.id;
    console.log(req.query.id)
    var phones_data = req.query.phones
    $.getJSON("../js/newPhone.json",function(data){
        console.log(data)
        phones = data.pool
    
        var user = new User({
            id: userID,
            pool:phones,
            new_pool:[],
            user: {
                id:userID,
                preferenceData: {
                    phones: phones_data,
                    timestamp: new Date()
                },
                user_preference_model:{},
                user_constraints:{},
                user_critique_preference:{}
            },
            topRecommendedSong:{},
            logger:{},
        });

    console.log(user.id)
    console.log(user.user)
    res.json(user)


    })
})





module.exports = router;