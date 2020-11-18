const socket = io();

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
const genreData = genreMapList

var spotifyToken = $.cookie('spotify-token')
var refreshToken = $.cookie('refresh-token')


var storage = window.localStorage;

var skipTimes = 0;

var phonelist = [];
var numberOfLikedPhones = 0;
var isPreStudy = true
var isSystemCrit = 1;
var viewedPhones = []
var isFinished = false
var topRecommendedSong;
var nextTimes = 0;
var showNextSong, showCurrentPhone, showNextSong2, showNextSong3, showCurrentPhone2, showFeedback, showTry;

var logger = {};

var usermodel = {}


//preference_oriented
//diversity_oriented
//personality_adjusted
//base
var sysCritVersion = window.location.search.substring(1)

console.log(sysCritVersion)

logger.dialog = []
logger.viewedPhones = []
logger.likedSongs = []
logger.dislikedSongs = []
logger.duration = ""
logger.rating = []

logger.exp_energy = []
logger.exp_danceability = []
logger.exp_speechiness = []
logger.exp_tempo = []
logger.exp_valence = []
logger.exp_artist = []
// logger.exp_lang = []
logger.exp_category = []
logger.exp_feature = []

var nextSongUtters = ["Great, here is another phone.", "OK, maybe you also like this phone.", "Good, please try the Show another phone."],
    rateUtters = ["Please rate your liked phone in terms of pleasant surprise.", "Don't forget to rate the phone in terms of pleasant surprise.", "You also need to rate the phone in terms of pleasant surprise."]


var systemLang = storage.language

// if (systemLang == "zh")
//     $("#user-id").show()

$(window).off('beforeunload');

$(document).ready(function () {


    var userID = ""
    // JSON.parse(storage.profile).id

    // By Wanling
    // Right Panel 
    // Log users' browse behavior on explanation on audio features 
    $(".exp").on("mouseenter", function () {
        var feature = $(this).text()
        if (feature == "Energy:")
            logger.exp_energy.push(new Date().getTime())
        else if (feature == "Danceability:")
            logger.exp_danceability.push(new Date().getTime())
        else if (feature == "Speechiness:")
            logger.exp_speechiness.push(new Date().getTime())
        else if (feature == "Tempo:")
            logger.exp_tempo.push(new Date().getTime())
        else if (feature == "Valence:")
            logger.exp_valence.push(new Date().getTime())
    })
    // By Wanling
    // Log users' click behavior on explanation on three categories: features; categories; artists   
    $("h3").on("click", function () {
        var title = $(this).text()
        if (title == "Explanation of features")
            logger.exp_feature.push(new Date().getTime())
        else if (title == "Explanation of music categories")
            logger.exp_category.push(new Date().getTime())
        else if (title == "Explanation of music language")
            logger.exp_lang.push(new Date().getTime())
        else if (title == "Explanation of artists")
            logger.exp_artist.push(new Date().getTime())
    })


    var windowHeight = $("#container").height() * 0.90;
    $(".iphone-x").height(windowHeight)
    $(".iphone-x").width(windowHeight * 36 / 78)


    $("#accordion").accordion({
        heightStyle: "fill"
    });
    $('[data-toggle="popover"]').popover({trigger: "hover"})


    /******************** music playing function ***********************/

        //alert("Please make sure you have submitted the pre-study questionnaire!")
        //refresh the token
    var userid = $.cookie('user-id')

    // By Wanling
    // reRankphonelist: put the obtained recommendation list in the front and put the left phones in the back of the list 
    function reRankphonelist(recomList) {
        var newphonelist = []
        for (var item in recomList) {

            if(recomList[item]){
                var phoneID = recomList[item]

                var filtered = phonelist.filter(function (el) {
                    return el.id == phoneID;
                })[0];
                newphonelist.push(filtered)
                phonelist.splice(phonelist.indexOf(filtered), 1)
            }
        }
        phonelist = newphonelist.concat(phonelist)
    }

    function initializeUserModel(user) {

        var profile_py = {}
        profile_py["user_profile"] = {}
        profile_py["user_profile"]["user"] = user

        $.ajax({
            type: "POST",
            url: "/initialize_user_model",
            data: JSON.stringify(profile_py),
            contentType: "application/json;charset=utf-8",
            dataType: "json",
            success: function (result) {
                var returned = JSON.parse(result)
                user = returned.user
                usermodel.user = returned.user
                console.log("初始: ", returned)

            },
            error: function (error) {
                console.log(error)
            }
        });

    }


    function updateUserModel(data) {
        var profile_py = {}
        profile_py["user_profile"] = {}
        profile_py["user_profile"]["user"] = data.user
        profile_py["user_profile"]["logger"] = data.logger
        profile_py["user_profile"]["topRecommendedSong"] = data.topRecommendedSong

        return $.ajax({
            type: "POST",
            url: "/update_user_model",
            contentType: "application/json;charset=utf-8",
            dataType: "json",
            data: JSON.stringify(profile_py),
            success: function (result) {
                var returned = JSON.parse(result)
                usermodel.user = returned.user
                console.log("更新: ", returned)
            },
            error: function (error) {
                console.log("error")
            },
        });
    }


    function getRecommendation(data) {

        var profile_py = {}
        profile_py["user_profile"] = {}
        profile_py["user_profile"]["pool"] = data.pool
        profile_py["user_profile"]["new_pool"] = data.new_pool
        profile_py["user_profile"]["user"] = data.user

        return $.ajax({
            type: "POST",
            url: "/get_rec",
            data: JSON.stringify(profile_py),
            contentType: "application/json;charset=utf-8",
            dataType: "json",
            success: function (result) {
                var returned = JSON.parse(result)
                // console.log("update pool: ", returned.user_profile.pool)
                phonelist = returned.user_profile.pool
                console.log("UC推荐: ", returned)
                if (returned.recommendation_list.length > 0)
                    reRankphonelist(returned.recommendation_list)
            },
            error: function (error) {
                console.log(error)
            }
        });
    }


    function systemCritiques(data) {

        var profile_py = {}
        profile_py["user_profile"] = {}
        profile_py["user_profile"]["pool"] = data.pool
        profile_py["user_profile"]["new_pool"] = data.new_pool
        profile_py["user_profile"]["user"] = data.user
        profile_py["user_profile"]["topRecommendedSong"] = data.topRecommendedSong
        profile_py["user_profile"]["logger"] = data.logger
        profile_py["sys_crit_version"] = data.sys_crit_version

        console.log(profile_py)

        return $.ajax({
            type: "POST",
            url: "/get_sys_cri",
            data: JSON.stringify(profile_py),
            contentType: "application/json;charset=utf-8",
            dataType: "json",
            success: function (result) {
                var returned = JSON.parse(result)
                console.log("SC推荐: ", returned)

                // reRankphonelist(recommendation_list)
                // console.log(phonelist)
            },
            error: function (error) {
                console.log(error)
            }
        });
    }


    function checkSystemCritiques(data) {

        var profile_py = {}
        profile_py["user_profile"] = {}
        profile_py["user_profile"]["topRecommendedSong"] = data.topRecommendedSong
        profile_py["user_profile"]["logger"] = data.logger

        console.log(profile_py)

        return $.ajax({
            type: "POST",
            url: "/trigger_sys_cri",
            data: JSON.stringify(profile_py),
            contentType: "application/json;charset=utf-8",
            dataType: "json",
            success: function (result) {
                var returned = JSON.parse(result)
                console.log("SC推荐判断: ", returned)

            },
            error: function (error) {
                console.log(error)
            }
        });
    }


    $.ajax({
        url: "js/newPhone.json",
        type: "GET",
        contentType: "application/json;charset=utf-8",
        dataType: "json",
        success: function (data) {

            usermodel = data
            console.log(usermodel)
            topRecommendedSong = usermodel.pool[0];
            usermodel.topRecommendedSong = topRecommendedSong

            //initialize user model
            initializeUserModel(usermodel.user)

            for (var index = 0; index < data.pool.length; index++) {
                phonelist.push(data.pool[index])
            }

            // ------------------------------------------
            // Process genre -> label niche genres
            var allGenres = []

            for(var index in phonelist){
                allGenres.push(phonelist[index].genre)
            }

            var mapGenres = allGenres.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map())

            // 所有次数
            genreTimes = Array.from(mapGenres.values())
            //去重后的值
            distinctGenres = Array.from(mapGenres.keys())

            //小众的genres的数量，已经小众的genres列表
            var fewGenres=[]
            for(var index in genreTimes){
                if(genreTimes[index]<11){
                    fewGenres.push(distinctGenres[index])
                }
            }
            //
            for(var index in phonelist) {
                for (var index2 in fewGenres) {
                    if (phonelist[index].genre == fewGenres[index2]) {
                        phonelist[index].realgenre = fewGenres[index2]
                        phonelist[index].genre = "niche"
                    }
                }
            }
            // ------------------------------------------


            $(".loading").hide()
            $(".window, #message").show()

            // var seed_artists = ""
            // for (var index in data.user.preferenceData.artist){
            //     seed_artists += data.user.preferenceData.artist[index].id+","
            // }
            // seed_artists = seed_artists.substr(0,seed_artists.length-1)
            //
            // var seed_tracks = ""
            // for (var index in data.user.preferenceData.track){
            //     seed_tracks += data.user.preferenceData.track[index].id+","
            // }
            // seed_tracks = seed_tracks.substr(0,seed_tracks.length-1)
            //
            // var seed_genres = data.user.preferenceData.genre[0].toString()
            //
            // recognition.lang = 'en-US';
            // recognition.interimResults = false;
            // recognition.maxAlternatives = 1;

            var phoneIndex = 0;
            var timeoutResumeInfinity;
            // var critiques = [],
            //     critiquesIndex = 0;
            var needReply = false;

            /******************** music chat function ***********************/

                // chat aliases
            var you = 'you';
            var robot = 'robot';
            var crit = 'crit';
            var skip = 'skip';
            var round = 0;

            // initialize
            // var bot = new chatBot();
            var chat = $('.chat');


            $("#start-task").on("click", function () {
                // synth.cancel()
                $("input#message").attr("disabled", true)
                $("input#message").attr("placeholder", "Please wait for a moment :)")

                clearTimeout(showTry)
                clearTimeout(showFeedback)
                clearTimeout(showNextSong)
                clearTimeout(showCurrentPhone)
                clearTimeout(showCurrentPhone2)
                clearTimeout(showNextSong2)
                clearTimeout(showNextSong3)
                logger = {}
                logger.rating = []
                logger.task1 = new Date().getTime()
                logger.dialog = []

                logger.viewedPhones = []
                logger.likedSongs = []
                logger.dislikedSongs = []
                logger.duration = ""


                logger.exp_energy = []
                logger.exp_danceability = []
                logger.exp_speechiness = []
                logger.exp_tempo = []
                logger.exp_valence = []
                logger.exp_artist = []
                logger.exp_category = []
                logger.exp_feature = []

                phonelist = []
                phoneIndex = 0

                isFinished = false
                isPreStudy = false

                //clear the chat content for new scenario
                $(".chat").empty()


                //clear the chat content for new scenario
                viewedPhones = []
                numberOfLikedPhones = 0
                $(".list-group").empty()

                //是否开启系统critique
                isSystemCrit = 1

                $("#start-task").hide()
                $("#likedphones").show()

                $(".list-group-item").hide()

                // initial chat state
                updateChat(robot, 'Hi there. Now you need to create a phonelist that contains 5 good phones.', "Initialize");
                setTimeout(function () {
                    updateChat(robot, "I have found some phones for you based on your preference, but you can also search for other phones by using the tips shown on the right side.", "Initialize")
                    var line = $('<div class="speak"><div class="spinner"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div></div>');
                    chat.append(line);
                }, 2000)

                $.ajax({
                    url: "/initiate?token=" + spotifyToken + "&id=" + userid,
                    type: "POST",
                    contentType: "application/json;charset=utf-8",
                    dataType: "json",
                    success: function (data2) {

                        usermodel = data2
                        console.log(usermodel)
                        topRecommendedSong = usermodel.pool[0];
                        usermodel.topRecommendedSong = topRecommendedSong

                        //initialize user model
                        initializeUserModel(usermodel.user)

                        for (var index = 0; index < data2.pool.length; index++) {
                            phonelist.push(data2.pool[index])
                        }

                        // ------------------------------------------
                        // Process genre -> label niche genres
                        var allGenres2 = []

                        for(var index in phonelist){
                            allGenres2.push(phonelist[index].genre)
                        }

                        var mapGenres2 = allGenres2.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map())

                        // 所有次数
                        genreTimes2 = Array.from(mapGenres2.values())
                        //去重后的值
                        distinctGenres2 = Array.from(mapGenres2.keys())

                        //小众的genres的数量，已经小众的genres列表
                        var fewGenres2=[]
                        for(var index in genreTimes2){
                            if(genreTimes2[index]<11){
                                fewGenres2.push(distinctGenres2[index])
                            }
                        }
                        //
                        for(var index in phonelist) {
                            for (var index2 in fewGenres2) {
                                if (phonelist[index].genre == fewGenres2[index2]) {
                                    phonelist[index].realgenre = fewGenres2[index2]
                                    phonelist[index].genre = "niche"
                                }
                            }
                        }
                        // ------------------------------------------

                        copyphonelist = data2.pool.concat()


                        setTimeout(function () {
                            $('.spinner').remove();
                            $("input#message").attr("disabled", false)
                            $("input#message").attr("placeholder", "Chat with me :)")

                            if (viewedPhones.indexOf(phonelist[phoneIndex]) < 0) {
                                viewedPhones.push(phonelist[phoneIndex])
                                setTimeout(function () {

                                    explaination = "We recommend this phone because you like "

                                    if (phonelist[phoneIndex].seedType == "artist")
                                        explaination += phonelist[phoneIndex].seed + "'s phones."
                                    else if (phonelist[phoneIndex].seedType == "track")
                                        explaination += "the phones " + phonelist[phoneIndex].seed + "."
                                    else if (phonelist[phoneIndex].seedType == "genre")
                                        explaination += "the phones of " + phonelist[phoneIndex].seed + "."

                                    if (explaination != "")
                                        updateChat(robot, explaination, "Explain")
                                }, 1000)

                                setTimeout(function () {
                                    showPhone(phonelist[phoneIndex].id)
                                }, 3000)

                            } else {
                                showPhone(phonelist[phoneIndex].id)
                            }
                        }, 5000)
                    }
                })

            })

            var critiques = [];
            var critiquesIndex = 0;

            var constructCritiques = function(firstThreeCrits){
                var critiques2 = [];
                for (var crt in firstThreeCrits) {

                    //var wording = "Do you like the phones of ";
                    var phoneType = "",
                        features = "";
                    var actionSet = {},
                        action = [];

                    var returnedCritiques = firstThreeCrits[crt].critique

                    for (var index in returnedCritiques) {

                        if (returnedCritiques[index].split("|")[0] == "language") {
                            var actionItem = {}
                            actionItem.prop = "language"
                            actionItem.val = returnedCritiques[index].split("|")[1]
                            actionItem.type = "equal"
                            action.push(actionItem)
                            phoneType += actionItem.val + ""

                        } else if (returnedCritiques[index].split("|")[0] == "genre") {
                            var actionItem = {}
                            actionItem.prop = "genre"
                            var genreName = returnedCritiques[index].split("|")[1]
                            if (genreName in genreData)
                                actionItem.val = genreData[genreName]
                            else
                                actionItem.val = genreName
                            actionItem.type = "equal"
                            action.push(actionItem)
                            phoneType += actionItem.val + ""

                        } else if (returnedCritiques[index].split("|")[0] == "artist") {
                            var actionItem = {}
                            actionItem.prop = "artist"
                            actionItem.val = returnedCritiques[index].split("|")[1]
                            actionItem.type = "equal"
                            action.push(actionItem)
                            phoneType += action.artist + ""

                        } else if (returnedCritiques[index].split("|")[1] == "lower") {
                            var actionItem = {}
                            actionItem.prop = returnedCritiques[index].split("|")[0]
                            // actionItem.val = -0.1
                            actionItem.type = "lower"
                            action.push(actionItem)
                            features += "lower " + returnedCritiques[index].split("|")[0] + ", "

                        } else if (returnedCritiques[index].split("|")[1] == "higher") {
                            var actionItem = {}
                            actionItem.prop = returnedCritiques[index].split("|")[0]
                            // actionItem.val = 0.1
                            actionItem.type = "higher"
                            action.push(actionItem)
                            features += "higher " + returnedCritiques[index].split("|")[0] + ", "
                        } else if (returnedCritiques[index].split("|")[1] == "similar") {
                            var actionItem = {}
                            actionItem.prop = returnedCritiques[index].split("|")[0]
                            // actionItem.val = 0.1
                            actionItem.type = "similar"
                            action.push(actionItem)
                            features += "similar " + returnedCritiques[index].split("|")[0] + ", "
                        }
                    }

                    var emphText=""
                    if (phoneType && !features) {
                        emphText = phoneType
                    }
                    else if (!phoneType && features) {
                        emphText = features.substr(0, features.length - 2)
                    }
                    else if (phoneType && features) {
                        emphText = phoneType + "and with " + features.substr(0, features.length - 2)
                    }

                    actionSet.speech = emphText


                    actionSet.action = action
                    actionSet.recommendation = firstThreeCrits[crt].recommendation
                    actionSet.critiques = returnedCritiques
                    console.log(actionSet)

                    critiques2.push(actionSet)

                }

                return critiques2
            }

            function getSysCrit() {
                var dialogNum = logger.dialog.length
                var dialog = logger.dialog[dialogNum - 1]

                var updateData = {}
                updateData.user = usermodel.user
                updateData.pool = phonelist
                updateData.new_pool = []
                updateData.logger = logger
                updateData.sys_crit_version = sysCritVersion

                updateData.logger.latest_dialog = [dialog]
                updateData.logger.viewedPhones = logger.viewedPhones
                var viewedPhonesLength = logger.viewedPhones.length
                updateData.topRecommendedSong = logger.viewedPhones[viewedPhonesLength - 1]

                console.log(updateData)

                systemCritiques(updateData).then(function (rawCrits) {
                    critiques = [];
                    critiquesIndex = 0;

                    var sc_result = JSON.parse(rawCrits)

                    console.log(sc_result)


                    var state = sc_result.state
                    var firstThreeCrits = []


                    if (state=="SC_and_Recommendation"){
                        firstThreeCrits = sc_result.result.slice(0, 3)
                        critiques = constructCritiques(firstThreeCrits)
                        console.log(critiques)
                        $('.spinner').remove();
                        updateChat(crit, critiques[critiquesIndex].speech, "System_Suggest", critiques[critiquesIndex].critiques, true);


                    }
                    else if (state=="Get_Songs_by_Genre"){
                        var genreName = sc_result.result
                        var genreNane_hphen = genreName.replace(" ", "-")
                        var genreNane_none = genreName.replace(" ", "")

                        var requestedLink = ""
                        if (genreName in genreData)
                            requestedLink = "/getRecom?token="+spotifyToken+"&genreSeeds="+genreName
                        else if (genreNane_hphen in genreData)
                            requestedLink = "/getRecom?token="+spotifyToken+"&genreSeeds="+genreName
                        else if (genreNane_none in genreData)
                            requestedLink = "/getRecom?token="+spotifyToken+"&genreSeeds="+genreName
                        else
                            requestedLink = '/searchphonelist?q=' + genreName + "&token=" + spotifyToken;

                        $.get(requestedLink,function (res) {

                            updateData.new_pool = res.tracks
                            console.log(updateData.new_pool)

                            //再次请求systemCritiques

                            systemCritiques(updateData).then(function (rawCrits) {
                                critiques = [];
                                critiquesIndex = 0;

                                var sc_result = JSON.parse(rawCrits)

                                console.log(sc_result)

                                var state = sc_result.state

                                //未做其他条件判断？

                                if (state=="SC_and_Recommendation"){
                                    firstThreeCrits = sc_result.result.slice(0, 3)

                                }
                                critiques = constructCritiques(firstThreeCrits)
                                console.log(critiques)
                                $('.spinner').remove();
                                updateChat(crit, critiques[critiquesIndex].speech, "System_Suggest", critiques[critiquesIndex].critiques, true);


                            })

                        })


                    }
                    else if (state=="Random_Genres"){
                        var genreNameList = sc_result.result
                        firstThreeCrits = []

                        for(var index in genreNameList){
                            firstThreeCrits[index] = {}
                            firstThreeCrits[index].critique = ["genre|"+genreNameList[index]]
                            firstThreeCrits[index].recommendation = []
                        }
                        critiques = constructCritiques(firstThreeCrits)
                        console.log(critiques)

                        $('.spinner').remove();
                        updateChat(crit, critiques[critiquesIndex].speech, "System_Suggest", critiques[critiquesIndex].critiques, true);
                    }

                })

            }

            // add a new line to the chat
            // [Wanling] - revise
            var dialog = {} // [Wanling]
            var updateChat = function (party, text, action, modality, crit_related = false ) {

                dialog.agent = party
                dialog.text = text
                dialog.action = action
                if (party == you)
                    dialog.modality = modality

                if (crit_related == true) {
                    var critList = critiques[critiquesIndex].critiques
                    var critiqueList = []

                    for (var index in critList) {
                        var critiqueContent = {}
                        critiqueContent[critList[index].split("|")[0]] = critList[index].split("|")[1]
                        critiqueList.push(critiqueContent)
                    }
                    dialog.critique = critiqueList
                    dialog.critiqued_phone = phonelist[phoneIndex].id
                }

                dialog.timestamp = new Date().getTime()
                var cloneDialog = JSON.parse(JSON.stringify(dialog))
                logger.dialog.push(cloneDialog)

                const utterance = new SpeechSynthesisUtterance();

                round++;

                // [Wanling] ?
                var style = 'you';
                if (party == you) {
                    $('#message').val('');
                    style = 'you';
                    var line = $('<div class="speak"><p class="dialog"></p></div>');
                    line.addClass(style)
                    line.find('.dialog').text(text);

                }
                else if (party == robot) {
                    style = 'robot';
                    var line = $('<div class="speak"><p class="dialog"></p></div>');
                    line.addClass(style)
                    line.find('.dialog').text(text);

                }
                else if (party == crit) {
                    style = 'robot';
                    var line = $('<div id="round' + round + '" class="speak"><p class="dialog"><span>Compared with the last phone you view, do you like the phone of </span><span class="emph-dialog" style="font-weight: bold"></span><span>?</span></p><button type="button" id="yes" class="feedback">Yes</button><button type="button" id="no" class="feedback">No</button></div>');
                    line.addClass(style)
                    line.find('.emph-dialog').text(text);
                    utterance.text = text;
                }
                else if (party == skip) {
                    style = 'robot';
                    var line = $('<div id="round' + round + '" class="speak"><p class="dialog"></p></div>');
                    line.addClass(style)
                    line.find('.dialog').text(text);

                    if(sysCritVersion!="base")
                        line.append('<div class="feedback-box"><button type="button" id="suggest" class="feedback">Let bot suggest</button></div>')

                    utterance.text = text;
                    chat.append(line);

                    $("#round" + round + " .feedback").click(function () {
                        nextTimes = 0
                        $("#round" + round + " .feedback").fadeOut()
                        updateChat(you, "I need some suggestions.", "Let_bot_suggest", "btn")
                        var line = $('<div class="speak"><div class="spinner"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div></div>');
                        chat.append(line);

                        getSysCrit()

                    })
                }

                chat.append(line);
                chat.stop().animate({
                    scrollTop: chat.prop("scrollHeight")
                });

                $("#round" + round + " #yes").click(function () {
                    $("#round" + round + " button").fadeOut()
                    // [Wanling] - revise

                    updateChat(you, "Yes, please!", "Accept_Suggestion", "btn", true)
                    // add critique when the user accepts a suggestion
                    // dialog.critique = critiques[critiquesIndex].critique

                    //perform update model request
                    var updateData = {}
                    updateData.user = usermodel.user
                    updateData.logger = {}
                    updateData.logger.latest_dialog = [dialog]
                    updateData.logger.viewedPhones = logger.viewedPhones

                    var viewedPhonesLength = logger.viewedPhones.length
                    updateData.topRecommendedSong = logger.viewedPhones[viewedPhonesLength - 1]

                    console.log(updateData)
                    updateUserModel(updateData)

                    // debug!
                    console.log(critiques[critiquesIndex].critiques)
                    // console.log(critiques[critiquesIndex].recommendation)
                    showPhone(phonelist[phoneIndex].id)


                    //如果包含推荐结果
                    // if(critiques[critiquesIndex].recommendation.length>0)
                    // {
                    //     reRankphonelist(critiques[critiquesIndex].recommendation)
                    //     // console.log(critiques[critiquesIndex].recommendation)
                    //     showPhone(phonelist[phoneIndex].id)
                    //
                    // }

                    //如果是random genres 没有推荐结果 -
                    // else{
                        // console.log(critiques[critiquesIndex].critiques)

                        // $.get("/getRecom?token="+spotifyToken+"&genreSeeds="+critiques[critiquesIndex].critiques[0].split("|")[1], function (res) {
                        //     //remove loading animation
                        //     $('.spinner').remove();
                        //     console.log(res)
                        //
                        //     var updateData = {}
                        //     updateData.user = usermodel.user
                        //     updateData.pool = phonelist
                        //     updateData.new_pool = res.tracks
                        //
                        //     console.log(updateData)
                        //
                        //     getRecommendation(updateData).then(function (data) {
                        //         var returnData = JSON.parse(data)
                        //         console.log(returnData)
                        //         phoneIndex = 0
                        //         showPhone(phonelist[phoneIndex].id)
                        //
                        //     })
                        //
                        //
                        //     // speakandsing(robot, response, "Coherence")
                        // })
                    // }

                    // reRankphonelist(critiques[critiquesIndex].recommendation)

                })

                $("#round" + round + " #no").click(function () {
                    $("#round" + round + " button").fadeOut()
                    // [Wanling] - revise
                    updateChat(you, "I don't want.", "Reject_Suggestion", "btn", true)

                    //perform update model request
                    var updateData = {}
                    updateData.user = usermodel.user
                    updateData.logger = {}
                    updateData.logger.latest_dialog = [dialog]
                    updateData.logger.viewedPhones = logger.viewedPhones

                    var viewedPhonesLength = logger.viewedPhones.length
                    updateData.topRecommendedSong = logger.viewedPhones[viewedPhonesLength - 1]

                    console.log(updateData)
                    updateUserModel(updateData)


                    if (critiquesIndex < critiques.length - 1) {
                        needReply = true;
                        critiquesIndex++;
                        console.log(critiques[critiquesIndex].critiques)
                        // [Wanling] - revise
                        updateChat(crit, critiques[critiquesIndex].speech, "System_Suggest",critiques[critiquesIndex].critiques, true);


                    } else if (critiquesIndex == critiques.length - 1) {
                        critiquesIndex = 0
                        updateChat(robot, "Sorry, I have no any other suggestions:(", "Respond_NoSuggestion");
                        // showPhone(phonelist[phoneIndex].id)
                    }
                })
            }

            var countGenreItems = function (genreName){
                var countNum = 0
                for (var index in phonelist){
                    if (phonelist[index].genre==genreName)
                        countNum++
                }
                return countNum
            }

            var showPhone = function (id) {

                var dialog = {}
                dialog.agent = "robot"
                dialog.text = id
                dialog.action = "Recommend"
                dialog.timestamp = new Date().getTime()
                logger.dialog.push(dialog)
                logger.viewedPhones.push(phonelist[phoneIndex])

                showCurrentPhone = setTimeout(function () {

                    console.log(numberOfLikedPhones)



                    // if (isSystemCrit == 1) {
                    //     var line = $('<div id="speak' + id + '" class="speak"><iframe src="https://open.spotify.com/embed/track/' + id + '" width="100%" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe></div>')
                    //var line = $('<div id="speak' + id + '" class="speak"><iframe src="http://localhost:8080/phoneData/phoneCard.html" width="100%" height="200px"></iframe></div>')
                    var currentPhone = phonelist[phoneIndex]
                    var line = $('<div id="speak' + id + '" class="speak"><div id="card">\n' +
                        '<div class="card-col left-col">\n' +
                        '<img id="phone-img" src='+currentPhone.img+'>\n' +
                        '<p id="price">$ '+currentPhone.price+'</p>\n' +
                        '</div>\n' +
                        '<div class="card-col right-col">\n' +
                        '<p class="title">'+currentPhone.modelname+'</p>\n' +
                        '<div class="spec">\n' +
                        '<div class="spec-title">\n' +
                        '<p>Storage</p>\n' +
                        '<p>Memory</p>\n' +
                        '<p>OS</p>\n' +
                        '<p>Camera</p>\n' +
                        '<p>Screen</p>\n' +
                        '<p>Resolution</p>\n' +
                        '<p>Battery</p>\n' +
                        '</div>\n' +
                        '<div class="spec-value">\n' +
                        '<p class="spec" id="storage">'+currentPhone.storage+'</p>\n' +
                        '<p class="spec" id="memory">'+currentPhone.ram+'</p>\n' +
                        '<p class="spec" id="os">'+currentPhone.os+'</p>\n' +
                        '<p class="spec" id="camera">'+currentPhone.cam1+' MP</p>\n' +
                        '<p class="spec" id="screen">'+currentPhone.displaysize+' inches</p>\n' +
                        '<p class="spec" id="resolution">'+currentPhone.resolution1+'*'+currentPhone.resolution2+'</p>\n' +
                        '<p class="spec" id="battery">'+currentPhone.battery+' mAh</p>\n' +
                        '</div>\n' +
                        '</div>\n' +
                        '<a id="detail" target="_blank" href="'+currentPhone.url+'">More Details</a>\n' +
                        '</div>\n' +
                        '</div></div>')

                    showFeedback = setTimeout(function () {
                            $("#speak" + id).append('<div class="feedback-box"><button type="button" id="like" class="feedback">Like</button><button type="button" id="next" class="feedback">Try another</button></div>')
                            if(sysCritVersion!="base")
                                $("#speak" + id + " > .feedback-box").append('<button type="button" id="suggest" class="feedback">Let bot suggest</button>')

                            $("#speak" + id + " #like").click(function () {

                                updateChat(you, "I like this phone.", "Accept_Song", "btn")

                                $("input#message").attr("disabled", true)
                                $("input#message").attr("placeholder", "Please rate your liked phone.")

                                var rateWording = rateUtters[parseInt((rateUtters.length * Math.random()))]
                                setTimeout(function () {
                                    updateChat(robot, rateWording, "Request_Rate")
                                }, 50)
                                nextTimes = 0

                                // numberOfLikedPhones = logger.likedSongs.length
                                if (!isFinished) {
                                    $("#speak" + id + " .feedback-box").fadeOut()

                                    if (numberOfLikedPhones <= 5) {
                                        if (data.user.preferenceData.track.length < 5)
                                            data.user.preferenceData.track.push(phonelist[phoneIndex].id)
                                        else
                                            data.user.preferenceData.track[5] = phonelist[phoneIndex].id

                                        $(".list-group").append("<li class='list-group-item' id='" + logger.viewedPhones.slice(-1)[0].id + "'>" + logger.viewedPhones.slice(-1)[0].name + "&nbsp;&nbsp;<i class='fa fa-close'></i><input type='number' class='rating' data-size='xs'></li>")
                                        $("#" + logger.viewedPhones.slice(-1)[0].id + " .rating").rating({min: 1, max: 5, step: 1});
                                        $("#" + logger.viewedPhones.slice(-1)[0].id + " .rating").on('rating:change', function (event, value, caption) {

                                            logger.likedSongs.push(phonelist[phoneIndex].id)

                                            //perform update model request

                                            var dialogNum = logger.dialog.length
                                            var dialog = logger.dialog[dialogNum - 1]


                                            var updateData = {}
                                            updateData.user = usermodel.user
                                            updateData.logger = {}
                                            updateData.logger.latest_dialog = [dialog]
                                            updateData.logger.viewedPhones = logger.viewedPhones
                                            updateData.logger.likedSongs = logger.likedSongs
                                            var viewedPhonesLength = logger.viewedPhones.length
                                            updateData.topRecommendedSong = logger.viewedPhones[viewedPhonesLength - 1]

                                            console.log(updateData)
                                            updateUserModel(updateData)

                                            $("#" + logger.viewedPhones.slice(-1)[0].id + " .rating").rating('refresh', {
                                                disabled: true,
                                                showClear: false,
                                                showCaption: true
                                            });
                                            $("#" + logger.viewedPhones.slice(-1)[0].id + "> .fa-close").hide()
                                            if (numberOfLikedPhones < 5) {
                                                $("input#message").attr("disabled", false)
                                                $("input#message").attr("placeholder", "")
                                                numberOfLikedPhones++

                                                //Exploration for niche genre music
                                                var likedSongGenre = topRecommendedSong.genre
                                                var likedSongArtist = topRecommendedSong.artist

                                                if(likedSongGenre=="niche" && countGenreItems(topRecommendedSong.realgenre)<11){

                                                    var requestLink, explanation;
                                                    if(topRecommendedSong.realgenre!="niche"){
                                                        requestLink = '/searchphonelist?q=' + topRecommendedSong.realgenre + "&token=" + spotifyToken;
                                                        explanation = "OK, I recommend this phone to you, because you like the phones of " + topRecommendedSong.realgenre + "."
                                                    }else{
                                                        requestLink = '/searchArtist?q=' + likedSongArtist + '&token=' + spotifyToken;
                                                        explanation = "OK, I recommend this phone to you, because you like " + likedSongArtist + "'s phones."
                                                    }
                                                    requestLink = encodeURI(requestLink)
                                                    playRequestLink(requestLink,explanation,false)

                                                }
                                                else{

                                                    //Check if SC should be triggered
                                                    var updateData2 = {}
                                                    updateData2.logger = logger
                                                    var viewedPhonesLength = logger.viewedPhones.length
                                                    updateData2.topRecommendedSong = logger.viewedPhones[viewedPhonesLength - 1]


                                                    //for base line setting

                                                    checkSystemCritiques(updateData2).then(function (returnedData) {
                                                        var enableSC = JSON.parse(returnedData).triggerSC

                                                        if(enableSC && sysCritVersion!="base"){
                                                            var line = $('<div class="speak"><div class="spinner"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div></div>');
                                                            chat.append(line);
                                                            getSysCrit()

                                                        }
                                                        else{

                                                            updateChat(robot, nextSongUtters[parseInt((nextSongUtters.length * Math.random()))], "Coherence")

                                                            showNextSong = setTimeout(function () {
                                                                $("#speak" + id + " div").fadeOut();
                                                                if (viewedPhones.indexOf(phonelist[phoneIndex]) < 0) {
                                                                    viewedPhones.push(phonelist[phoneIndex])
                                                                    showNextSong3 = setTimeout(function () {
                                                                        showPhone(phonelist[phoneIndex].id)
                                                                    }, 1000)

                                                                } else {
                                                                    showPhone(phonelist[phoneIndex].id)
                                                                }
                                                            }, 10)
                                                        }
                                                    })

                                                }
                                            }

                                            if (numberOfLikedPhones == 5 && !isPreStudy) {
                                                isFinished = true

                                                logger.task1 = new Date().getTime() - logger.task1
                                                logger.viewedPhones = viewedPhones.concat()
                                                logger.rating = []
                                                $("li.list-group-item").each(function (i) {
                                                    var rating = {}
                                                    rating.id = $(this).attr("id")
                                                    rating.value = $(this).find(".rating-stars").attr("title")
                                                    logger.rating.push(rating)
                                                })

                                                data.logger = logger
                                                console.log("上传日志: ", data)
                                                window.localStorage.setItem("log",JSON.stringify(data))


                                                window.location.href = "/que2"

                                            } else if (numberOfLikedPhones == 5 && isPreStudy) {
                                                updateChat(robot, "Now, you should be familiar with the system. You can click the 'start study' button to start.", "Initialize")
                                                $("input#message").attr("disabled", true)
                                                $("input#message").attr("placeholder", "Please click the 'start study' button to start!")
                                            }
                                        });

                                        // remove a liked phone
                                        $("#" + logger.viewedPhones.slice(-1)[0].id + "> .fa-close").click(function () {
                                            $(this).parent().remove()
                                            $("input#message").attr("disabled", false)
                                            $("input#message").attr("placeholder", "")
                                            showPhone(phonelist[phoneIndex].id)
                                        })
                                    }
                                }
                            })

                            $("#speak" + id + " #next").click(function () {
                                nextTimes++;
                                //if (nextTimes < 3) {
                                $("#speak" + id + " .feedback-box").fadeOut()
                                updateChat(you, "Show another phone.", "Next", "btn")
                                logger.dislikedSongs.push(phonelist[phoneIndex].id)

                                //Check if SC should be triggered
                                var updateData = {}
                                updateData.logger = logger
                                var viewedPhonesLength = logger.viewedPhones.length
                                updateData.topRecommendedSong = logger.viewedPhones[viewedPhonesLength - 1]

                                showPhone(phonelist[phoneIndex].id)

                                // checkSystemCritiques(updateData).then(function (returnedData) {
                                //     var enableSC = JSON.parse(returnedData).triggerSC
                                //
                                //     if (enableSC && sysCritVersion!="base") {
                                //         var line = $('<div class="speak"><div class="spinner"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div></div>');
                                //         chat.append(line);
                                //         getSysCrit()
                                //
                                //     } else {
                                //
                                //         showNextSong2 = setTimeout(function () {
                                //             $("#speak" + id + " div").fadeOut();
                                //             if (viewedPhones.indexOf(phonelist[phoneIndex]) < 0) {
                                //                 viewedPhones.push(phonelist[phoneIndex])
                                //
                                //                 setTimeout(function () {
                                //                     showPhone(phonelist[phoneIndex].id)
                                //                 }, 1000)
                                //
                                //             } else {
                                //                 showPhone(phonelist[phoneIndex].id)
                                //             }
                                //         }, 10)
                                //
                                //     }
                                //
                                // })

                                //}
                                // else {
                                //     $("#speak" + id + " .feedback-box").fadeOut()
                                //     updateChat(you, "Show another phone.", "Next", "btn")
                                //     logger.dislikedSongs.push(phonelist[phoneIndex].id)
                                //     setTimeout(function () {
                                //         $("#speak" + id + " div").fadeOut();
                                //         updateChat(skip, 'Since you have skipped many phones, you can click the "Let bot suggest" button to get suggestions, or you can just tell me what kind of music you want to listen to?', "Request_Critique");
                                //     }, 300)
                                // }

                            })

                            $("#speak" + id + " #suggest").click(function () {

                                nextTimes = 0
                                $("#speak" + id + " .feedback-box").fadeOut()
                                updateChat(you, "I need some suggestions.", "Let_bot_suggest", "btn")
                                $("#speak" + id + " div").fadeOut();
                                var line = $('<div class="speak"><div class="spinner"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div></div>');
                                chat.append(line);

                                getSysCrit()
                            })
                            chat.stop().animate({
                                scrollTop: chat.prop("scrollHeight")
                            });

                        }, 3000)

                    line.addClass("other")
                    chat.append(line);
                    chat.stop().animate({
                        scrollTop: chat.prop("scrollHeight")
                    });

                }, 1000)

                topRecommendedSong = phonelist[0]
                phonelist.splice(phoneIndex, 1)
            }


            if (isPreStudy) {
                //Initializae
                updateChat(robot, 'Hello. Welcome to play phone bot! To warm up for study, you can read some tips on right side and try to talk with bot for finding your phones.', "Initialize");
                showTry = setTimeout(function () {
                    updateChat(robot, "Once you are ready for the study, you can click the 'Start study' button on the left side.", "Initialize")
                    showPhone(phonelist[phoneIndex].id)
                }, 3000)
            }

            $('input#message').bind('keypress', function (event) {
                var text = document.querySelector('input#message').value
                if (event.keyCode == "13") {

                    if (text != "") {
                        //synth.cancel()
                        $(".feedback").remove()
                        clearTimeout(showFeedback)
                        clearTimeout(showNextSong)
                        clearTimeout(showCurrentPhone)
                        clearTimeout(showCurrentPhone2)
                        clearTimeout(showNextSong2)
                        clearTimeout(showNextSong3)
                        nextTimes = 0
                        socket.emit('chat message', text);
                        updateChat(you, text, "User_Critique", "typing");

                        if (text.indexOf("next") > -1) {
                            showPhone(phonelist[phoneIndex].id)
                        }
                    }
                }
            })

            recognition.addEventListener('speechstart', () => {
                console.log('Speech has been detected.');
            });

            recognition.addEventListener('result', (e) => {
                console.log('Result has been detected.');
                let last = e.results.length - 1;
                let text = e.results[last][0].transcript;

                if (text != "") {
                    //synth.cancel()
                    $(".feedback").remove()
                    clearTimeout(showFeedback)
                    clearTimeout(showNextSong)
                    clearTimeout(showCurrentPhone)
                    clearTimeout(showCurrentPhone2)
                    clearTimeout(showNextSong2)
                    clearTimeout(showNextSong3)
                    nextTimes = 0
                    //updateChat(you, text, "voice", "Respond_Unknown", [], {});
                    console.log('Confidence: ' + e.results[0][0].confidence);
                    socket.emit('chat message', text);
                }
            });

            recognition.addEventListener('speechend', () => {
                recognition.stop();
                $('.fa-microphone').show()
                $('.boxContainer').hide()
            });

            recognition.addEventListener('error', (e) => {
                //updateChat(robot, 'Sorry, we find an error during voice recognition.', "text", "Respond_Unknown", [], {});
            });

            function updateAndGetRec(critique) {
                return new Promise(function (resolve, reject) {

                    var dialogNum = logger.dialog.length

                    var dialog = logger.dialog[dialogNum - 1]

                    dialog.critique = critique
                    dialog.critiqued_phone = topRecommendedSong.id

                    //perform update model request
                    var updateData = {}
                    updateData.user = usermodel.user
                    updateData.logger = {}
                    updateData.logger.latest_dialog = [dialog]
                    updateData.logger.viewedPhones = logger.viewedPhones

                    var viewedPhonesLength = logger.viewedPhones.length
                    updateData.topRecommendedSong = logger.viewedPhones[viewedPhonesLength - 1]

                    console.log(updateData)

                    updateUserModel(updateData).done(function () {
                        //Get recommendation
                        var updateData2 = {}
                        updateData2.user = usermodel.user
                        updateData2.pool = phonelist
                        updateData2.new_pool = []

                        getRecommendation(updateData2).then(function (data) {
                            var returnData = JSON.parse(data)
                            console.log(returnData)
                            reRankphonelist(returnData.recommendation_list)
                            resolve(returnData.recommendation_list.length)
                        })
                    })
                });
            }


            var numberOfMiss = 0;

            function playRequestLink(requestLink,response,isMissed) {
                if (requestLink) {
                    //show loading animation
                    var line = $('<div class="speak"><div class="spinner"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div></div>');
                    chat.append(line);
                    $.get(requestLink, function (res) {
                        //remove loading animation
                        $('.spinner').remove();
                        console.log(res.tracks)
                        // filter phones that have been listened by user
                        filtered_tracks = []
                        for (var item in res.tracks){
                            filtered_tracks.push(res.tracks[item])
                        }
                        if (logger.viewedPhones.length >0){
                            for (var item in logger.viewedPhones) {

                                var phoneID = logger.viewedPhones[item].id

                                var filtered = filtered_tracks.filter(function (el) {
                                    // console.log(el.id == phoneID)
                                    return el.id == phoneID;
                                });
                                if (filtered.length>0)
                                    filtered_tracks.splice(filtered_tracks.indexOf(filtered[0]), 1)

                            }
                        }
                        console.log('After filtering: ')
                        console.log(filtered_tracks)



                        var updateData = {}
                        updateData.user = usermodel.user
                        updateData.pool = phonelist
                        updateData.new_pool = filtered_tracks

                        console.log(updateData)

                        getRecommendation(updateData).then(function (data) {
                            var returnData = JSON.parse(data)
                            console.log(returnData)
                            phoneIndex = 0
                            speakandsing(robot, response, "Coherence")
                        })


                    })
                } else if (!requestLink && isMissed) {
                    if (numberOfMiss < 2) {
                        numberOfMiss++;
                        updateChat(robot, "Sorry, I do not understand. Can you rephrase the sentence?", "Respond_Unknown")
                    } else {
                        numberOfMiss = 0
                        var random = Math.random()
                        if (random >= 0 && random < 0.3)
                            updateChat(robot, "You can try to say 'I like fast phones' or 'I like pop music'", "Initialize")
                        else if (random >= 0.3 && random < 0.6)
                            updateChat(robot, "You can try to say 'Play a phone for dancing' or 'I feel happy'", "Initialize")
                        else if (random >= 0.6 && random < 1)
                            updateChat(robot, "You can try to say 'I need more energy' or 'I like Chinese phones'", "Initialize")
                    }
                } else {
                    if (!needReply)
                        speakandsing(robot, "Ok, I found a phone for you.", "Coherence")
                }
            }


            function speakandsing(agent, text, action) {

                updateChat(agent, text, action, "text");


                if (viewedPhones.indexOf(topRecommendedSong) < 0) {
                    viewedPhones.push(topRecommendedSong)
                    setTimeout(function () {
                        var explaination = ""

                        if (agent == "you") {

                            explaination = "We recommend this phone because you like "

                            if (topRecommendedSong.seedType == "artist")
                                explaination += topRecommendedSong.seed + "'s phones."
                            else if (topRecommendedSong.seedType == "track")
                                explaination += "the phones " + topRecommendedSong.seed + "."
                            else if (topRecommendedSong.seedType == "genre")
                                explaination += "the phones of " + topRecommendedSong.seed + "."
                        }
                        if (explaination)
                            updateChat(robot, explaination, "Explain")

                    }, 500)

                    showCurrentPhone2 = setTimeout(function () {
                        console.log(phonelist)
                        showPhone(phonelist[phoneIndex].id)
                    }, 3000)

                }
                else {
                    showPhone(phonelist[phoneIndex].id)
                }
            }

            /*
             This function parses the returned data from Dialog flow
             */
            function synthVoice(text) {
                //const synth = window.speechSynthesis;
                //const utterance = new SpeechSynthesisUtterance();
                /*fields for returned data
                 artist
                 music-features
                 music-languages
                 music-genres
                 feature-actions
                 music-valence
                 phone
                 */

                var intent = text.intent.displayName;
                var response_speech = text.fulfillmentText;

                console.log(text)

                var artist, phone, genre, valence, tempo, action, feature;
                var explaination = ""

                var requestLink;
                var critique = []

                //Check if SC should be triggered
                // var updateData = {}
                // updateData.logger = logger
                // var viewedPhonesLength = logger.viewedPhones.length
                // updateData.topRecommendedSong = logger.viewedPhones[viewedPhonesLength - 1]


                // checkSystemCritiques(updateData).then(function (returnedData) {
                //     var enableSC = JSON.parse(returnedData).triggerSC


                //     if(enableSC && sysCritVersion!="base"){
                //         var line = $('<div class="speak"><div class="spinner"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div></div>');
                //         chat.append(line);
                //         getSysCrit()

                //     }
                //     else{
                        //search by artist
                        if (intent.indexOf("smalltalk")>-1){
                            updateChat(robot, response_speech, "Small_talk", "text");
                        }
                        else if(intent == "phone_search_attribute") {
                            updateChat(robot, response_speech, "user_critique", "text");
                        }
                        // else if (intent == "music_player_control.skip_forward") {
                        //     skipTimes++;
                        // }
                        // else if (intent == "music.search") {
                        //
                        //     artist = text.parameters["artist"]
                        //     genre = text.parameters["genre"]
                        //
                        //     if (artist.length > 0)
                        //         critique.push({"artist": artist.toString()})
                        //     if (genre != "")
                        //         critique.push({"genre": genre})
                        //
                        //     console.log(critique)
                        //
                        //     if (critique.length > 0) {
                        //
                        //         updateAndGetRec(critique).then(function (data) {
                        //             console.log(data)
                        //             var num = parseInt(data)
                        //
                        //             if (num < 10) {
                        //                 if (artist.length > 0) {
                        //                     requestLink = '/searchArtist?q=' + artist[0] + '&token=' + spotifyToken;
                        //                     explaination = "OK, I recommend this phone to you, because you like " + artist + "'s phones."
                        //
                        //                 } else if (genre) {
                        //                     requestLink = '/searchphonelist?q=' + genre + "&token=" + spotifyToken;
                        //                     explaination = "OK, I recommend this phone to you, because you like the phones of " + genre + "."
                        //                 } else
                        //                     requestLink = ''
                        //
                        //                 requestLink = encodeURI(requestLink)
                        //
                        //                 playRequestLink(requestLink,explaination,false)
                        //             }
                        //             else {
                        //                 phoneIndex = 0
                        //                 speakandsing(robot, response_speech, "Coherence")
                        //             }
                        //         })
                        //     }
                        //
                        // }
                        // else if (intent == "music_player_control.features") {
                        //     valence = text.parameters["music-valence"]
                        //     tempo = text.parameters["music-tempo"]
                        //     action = text.parameters["feature-actions"]
                        //     feature = text.parameters["music-features"]
                        //
                        //     if (tempo == "fast")
                        //         critique.push({"tempo": "higher"})
                        //     else if (tempo == "normal")
                        //         critique.push({"tempo": "normal"})
                        //     else if (tempo == "slow")
                        //         critique.push({"tempo": "lower"})
                        //
                        //     if (valence == "happy")
                        //         critique.push({"valence": "higher"})
                        //     else if (valence == "neutral")
                        //         critique.push({"valence": "normal"})
                        //     else if (valence == "sad")
                        //         critique.push({"valence": "lower"})
                        //
                        //     if (feature) {
                        //         var item = {}
                        //         if (!action)
                        //             action = "higher"
                        //
                        //         if (feature == 'speech')
                        //             feature = "speechiness"
                        //
                        //         item[feature] = action
                        //         console.log(item)
                        //         critique.push(item)
                        //     }
                        //
                        //     if (critique.length > 0) {
                        //         updateAndGetRec(critique).then(function (number) {
                        //             var num = parseInt(number)
                        //             if (num == 0) {
                        //                 console.log("没有找到匹配的歌曲")
                        //                 var seed_artist = topRecommendedSong['artist']
                        //                 var seed_track= topRecommendedSong['id']
                        //                 var seed_genre = topRecommendedSong['genre']
                        //                 var seed_description = '&seed_tracks=' + seed_track //'&artistSeeds=' + seed_artist + '&seed_tracks=' + seed_track
                        //                 if (seed_genre in genreData)
                        //                     seed_description = seed_description + '&genreSeeds=' + seed_genre
                        //                 console.log(seed_description)
                        //
                        //                 requestLink = '/getRecom?token=' + spotifyToken + seed_description;
                        //
                        //
                        //                 if (valence) {
                        //                     if (valence == "happy") {
                        //                         var tartget_value = 1.05 * topRecommendedSong["valence"]
                        //                         requestLink = requestLink + '&target_valence=' + tartget_value;
                        //                     }
                        //                     else if (valence == "neutral") {
                        //                         requestLink = requestLink + '&target_valence=' + topRecommendedSong["valence"];
                        //
                        //                     }
                        //                     else if (valence == "sad") {
                        //                         var tartget_value = 0.95 * topRecommendedSong["valence"]
                        //                         requestLink = requestLink + '&target_valence=' + tartget_value;
                        //                     }
                        //                     explaination = "OK, I recommend this phone to you, because you like the phones for "+valence+ " mood."
                        //                 } else if (tempo) {
                        //                     if (tempo == "fast") {
                        //                         var tartget_value = 1.05 * topRecommendedSong["tempo"]
                        //                         requestLink = requestLink + '&target_tempo=' + tartget_value;
                        //
                        //                     }
                        //                     else if (tempo == "normal") {
                        //                         requestLink = requestLink + '&target_tempo=' + topRecommendedSong["tempo"];
                        //
                        //                     } else if (tempo == "slow") {
                        //                         var tartget_value = 0.95 * topRecommendedSong["tempo"]
                        //                         requestLink = requestLink + '&target_tempo=' + tartget_value;
                        //
                        //                     }
                        //                     explaination = "OK, I recommend this phone to you, because you like the phones having " +tempo+ " tempo."
                        //                 } else if (feature) {
                        //                     if (feature == "speech")
                        //                         feature = "speechiness"
                        //                     if (action == "higher") {
                        //                         var tartget_value = 1.05 * topRecommendedSong[feature]
                        //
                        //                         requestLink = requestLink + '&target_'+feature+'=' + tartget_value;
                        //
                        //                         explaination = "OK, I recommend this phone to you, because you like the phones of higher"+ feature+"."
                        //                     }
                        //                     else if (action == "lower") {
                        //                         var tartget_value = 0.95 * topRecommendedSong[feature]
                        //
                        //                         requestLink = requestLink + '&target_'+feature+'=' + tartget_value;
                        //
                        //                         explaination = "OK, I recommend this phone to you, because you like the phones of lower"+ feature+"."
                        //                     }
                        //                     else if (action == "") {
                        //
                        //                         requestLink = requestLink + '&target_'+feature+'=' + topRecommendedSong[feature];
                        //
                        //                         explaination = "OK, I recommend this phone to you, because you like the last played phones in terms of its "+ feature+"."
                        //                     }
                        //
                        //                 }
                        //                 console.log(requestLink)
                        //                 requestLink = encodeURI(requestLink)
                        //                 playRequestLink(requestLink,explaination,false)
                        //             }
                        //             else {
                        //                 phoneIndex = 0
                        //                 speakandsing(robot, response_speech, "Coherence")
                        //             }
                        //         })
                        //     }
                        //
                        // }
                        // else if (intent == "music_player_control.features" ) {
                        //     needReply = false;
                        //     var response = text.parameters["RESPONSE"]
                        //     if (response == "yes") {
                        //         //perform critiquing on existing set
                        //
                        //         var newlist = data.pool.concat()
                        //         for (var index2 in critiques[critiquesIndex].action) {
                        //             var templist = []
                        //             newlist.map(function (track) {
                        //                 var critAttr = critiques[critiquesIndex].action[index2].prop
                        //                 var critType = critiques[critiquesIndex].action[index2].type
                        //                 if (critType == "equal") {
                        //                     console.log(critiques[critiquesIndex].action[index2].val)
                        //                     if (track[critAttr] == critiques[critiquesIndex].action[index2].val) {
                        //                         templist.push(track)
                        //                         data.user.preferenceData[critAttr + "Range"][0] = 0
                        //                         data.user.preferenceData[critAttr + "Range"][1] = data.topRecommendedSong[critAttr] - data.user.preferenceData_variance[critAttr]
                        //                         data.user.preferenceData[critAttr + "Range"][2] = "low"
                        //                     }
                        //                 } else if (critType == "lower") {
                        //                     console.log(data.user.preferenceData[critAttr])
                        //                     if (track[critAttr] < data.topRecommendedSong[critAttr] - data.user.preferenceData_variance[critAttr]) {
                        //                         templist.push(track)
                        //                     }
                        //                 } else if (critType == "higher") {
                        //                     console.log(data.user.preferenceData[critAttr])
                        //                     if (track[critAttr] > data.topRecommendedSong[critAttr] + data.user.preferenceData_variance[critAttr]) {
                        //                         templist.push(track)
                        //                         data.user.preferenceData[critAttr + "Range"][0] = data.topRecommendedSong[critAttr] + data.user.preferenceData_variance[critAttr]
                        //                         data.user.preferenceData[critAttr + "Range"][1] = 1
                        //                         data.user.preferenceData[critAttr + "Range"][2] = "high"
                        //                     }
                        //                 } else if (critType == "similar") {
                        //                     console.log(data.user.preferenceData[critAttr])
                        //                     if (track[critAttr] >= data.topRecommendedSong[critAttr] - data.user.preferenceData_variance[critAttr] && track[critAttr] <= data.topRecommendedSong[critAttr] + data.user.preferenceData_variance[critAttr]) {
                        //                         templist.push(track)
                        //                         data.user.preferenceData[critAttr + "Range"][0] = data.topRecommendedSong[critAttr] - data.user.preferenceData_variance[critAttr]
                        //                         data.user.preferenceData[critAttr + "Range"][1] = data.topRecommendedSong[critAttr] + data.user.preferenceData_variance[critAttr]
                        //                         data.user.preferenceData[critAttr + "Range"][2] = "middle"
                        //                     }
                        //                 }
                        //             })
                        //             newlist = templist.concat()
                        //             console.log(newlist)
                        //         }
                        //         phonelist = newlist.concat()
                        //
                        //         console.log(phonelist)
                        //         phoneIndex = 0
                        //     }
                        //     else if (response == "no") {
                        //         if (critiquesIndex < critiques.length - 1) {
                        //             needReply = true;
                        //             critiquesIndex++;
                        //             //TO CONFIRM
                        //             updateChat(crit, critiques[critiquesIndex].speech, "System_Suggest", "text", true);
                        //
                        //         } else if (critiquesIndex == critiques.length - 1) {
                        //             critiquesIndex = 0
                        //             speakandsing(robot, "OK, I have no more suggestions, but maybe you want to try this phone.", "Respond_NoSuggestion")
                        //         }
                        //     }
                        // }

                        else if (!intent) {
                            requestLink = ''
                            playRequestLink(requestLink,response_speech,true)
                        }

                //     }

                // })


            }

            socket.on('bot reply', function (data) {
                synthVoice(data)
            });

            function resumeInfinity() {
                window.speechSynthesis.resume();
                timeoutResumeInfinity = setTimeout(resumeInfinity, 1000);
            }

        },
        error: function (jqXHR, err) {
            console.log(err);
            if (err === "timeout") {
                $.ajax(this)
            }
        },

    });
})