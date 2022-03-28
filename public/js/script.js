const socket = io();

var storage = window.localStorage;

var skipTimes = 0;

var phonelist = [];
var numberOfLikedPhones = 0;
var isPreStudy = true
var isSystemCrit = 1;
var viewedPhones = []
var isFinished = false
var nextTimes = 0;

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
logger.likedPhones = []
logger.dislikedPhones = []
logger.duration = ""
logger.rating = []

var preferenceData ={}
preferenceData.phones = []

var nextPhoneUtters = ["Great, here is another phone.", "OK, maybe you also like this phone.", "Good, please try the Show another phone."],
    rateUtters = ["Please rate your liked phone.", "Don't forget to rate the phone.", "You also need to rate the phone."]

$(window).off('beforeunload');

$(document).ready(function () {

    var windowHeight = $("#container").height() * 0.90;
    $(".iphone-x").height(windowHeight)
    $(".iphone-x").width(windowHeight * 36 / 78)
    
    $("#accordion").accordion({
        heightStyle: "fill"
    });
    $('[data-toggle="popover"]').popover({trigger: "hover"})


    /******************** phone recommendation function ***********************/


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
                console.log("Initialize: ", returned)

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
        profile_py["user_profile"]["topRecommendedPhone"] = data.topRecommendedPhone

        return $.ajax({
            type: "POST",
            url: "/update_user_model",
            contentType: "application/json;charset=utf-8",
            dataType: "json",
            data: JSON.stringify(profile_py),
            success: function (result) {
                var returned = JSON.parse(result)
                usermodel.user = returned.user
                console.log("Update: ", returned)
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
                console.log("UC_recommendation: ", returned)
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
        profile_py["user_profile"]["topRecommendedPhone"] = data.topRecommendedPhone
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
                console.log("SC_recommendation: ", returned)

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
        profile_py["user_profile"]["topRecommendedPhone"] = data.topRecommendedPhone
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
                console.log("SC_judge_recommendations: ", returned)

            },
            error: function (error) {
                console.log(error)
            }
        });
    }

/*
Load phone data, may connect to phone database
 */
    $.ajax({
        url: "js/newPhone.json",
        type: "GET",
        contentType: "application/json;charset=utf-8",
        dataType: "json",
        success: function (data) {

            usermodel = data
            console.log(usermodel)
            topRecommendedPhone = usermodel.pool[0];
            usermodel.topRecommendedPhone = topRecommendedPhone

            //initialize user model
            initializeUserModel(usermodel.user)

            //TODO: need to replace this phonelist by the recommendation dataset

            for (var index = 0; index < data.pool.length; index++) {
                phonelist.push(data.pool[index])
            }

            $(".loading").hide()
            $(".window, #message").show()


            var phoneIndex = 0;
            var needReply = false;

            /******************** phone chat function ***********************/

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

                logger = {}
                logger.rating = []
                logger.task1 = new Date().getTime()
                logger.dialog = []

                logger.viewedPhones = []
                logger.likedPhones = []
                logger.dislikedPhones = []
                logger.duration = ""

                phoneIndex = parseInt(Math.random()*1000)

                isFinished = false
                isPreStudy = false

                //clear the chat content for new scenario
                $(".chat").empty()


                //clear the chat content for new scenario
                viewedPhones = []
                numberOfLikedPhones = 0
                $(".list-group").empty()

                //is enabled critique
                isSystemCrit = 1

                $("#start-task").hide()
                $("#likedphones").show()

                $(".list-group-item").hide()

                // initial chat state
                updateChat(robot, 'Hi there. I know you want to buy a new phone. I have found some phones for you based on your preference. You can add your liked phones to the shopping cart.', "Initialize");
                setTimeout(function () {
                    updateChat(robot, "But, you could also search for other phones by using the tips shown on the right side.", "Initialize")
                    // var line = $('<div class="speak"><div class="spinner"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div></div>');
                    // chat.append(line);

                    //TODO: replace this mocked data by recommendation function
                    showPhone(phonelist[phoneIndex].id)

                }, 2000)

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

                        if (returnedCritiques[index].split("|")[0] == "brand") {
                            var actionItem = {}
                            actionItem.prop = "brand"
                            actionItem.val = returnedCritiques[index].split("|")[1]
                            actionItem.type = "equal"
                            action.push(actionItem)
                            phoneType += actionItem.val + ""
                        // 4g / 5g
                        } else if (returnedCritiques[index].split("|")[0] == "network") {
                            var actionItem = {}
                            actionItem.prop = "network"
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

            function getSysCrit_mocked(){
                $('.spinner').remove();
                updateChat(robot, "[Need to update system critiquing function.]", "Mocked_SysCrit")
                showPhone(phonelist[phoneIndex].id)
            }

            //TODO:to update getSysCrit according to phone data
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
                updateData.topRecommendedPhone = logger.viewedPhones[viewedPhonesLength - 1]

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

                round++;

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
                }
                else if (party == skip) {
                    style = 'robot';
                    var line = $('<div id="round' + round + '" class="speak"><p class="dialog"></p></div>');
                    line.addClass(style)
                    line.find('.dialog').text(text);

                    if(sysCritVersion!="base")
                        line.append('<div class="feedback-box"><button type="button" id="suggest" class="feedback">Let bot suggest</button></div>')

                    chat.append(line);

                    $("#round" + round + " .feedback").click(function () {
                        nextTimes = 0
                        $("#round" + round + " .feedback").fadeOut()
                        updateChat(you, "I need some suggestions.", "Let_bot_suggest", "btn")
                        var line = $('<div class="speak"><div class="spinner"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div></div>');
                        chat.append(line);

                        getSysCrit_mocked()
                        //getSysCrit()

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
                    updateData.topRecommendedPhone = logger.viewedPhones[viewedPhonesLength - 1]

                    console.log(updateData)
                    updateUserModel(updateData)

                    // debug!
                    console.log(critiques[critiquesIndex].critiques)
                    // console.log(critiques[critiquesIndex].recommendation)
                    showPhone(phonelist[phoneIndex].id)

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
                    updateData.topRecommendedPhone = logger.viewedPhones[viewedPhonesLength - 1]

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
                    // phonelist is an initial recommendation pool
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
                        '<p class="spec" id="os">'+currentPhone.os1+'</p>\n' +
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
                            $("#speak" + id).append('<div class="feedback-box"><button type="button" id="like" class="feedback">Add to cart</button><button type="button" id="next" class="feedback">Try another</button></div>')
                            if(sysCritVersion!="base")
                                $("#speak" + id + " > .feedback-box").append('<button type="button" id="suggest" class="feedback">Let bot suggest</button>')

                            $("#speak" + id + " #like").click(function () {

                                updateChat(you, "I like this phone.", "Accept_Phone", "btn")

                                $("input#message").attr("disabled", true)
                                $("input#message").attr("placeholder", "Please rate your liked phone.")

                                var rateWording = rateUtters[parseInt((rateUtters.length * Math.random()))]
                                setTimeout(function () {
                                    updateChat(robot, rateWording, "Request_Rate")
                                }, 50)
                                nextTimes = 0

                                // numberOfLikedPhones = logger.likedPhones.length
                                if (!isFinished) {
                                    $("#speak" + id + " .feedback-box").fadeOut()

                                    if (numberOfLikedPhones <= 5) {
                                        if (preferenceData.phones.length < 5)
                                            preferenceData.phones.push(phonelist[phoneIndex].id)
                                        else
                                            preferenceData.phones[5] = phonelist[phoneIndex].id

                                        $(".list-group").append("<li class='list-group-item' id='" + logger.viewedPhones.slice(-1)[0].id + "'>" + logger.viewedPhones.slice(-1)[0].modelname + "&nbsp;&nbsp;<i class='fa fa-close'></i><input type='number' class='rating' data-size='xs'></li>")
                                        $("#" + logger.viewedPhones.slice(-1)[0].id + " .rating").rating({min: 1, max: 5, step: 1});
                                        $("#" + logger.viewedPhones.slice(-1)[0].id + " .rating").on('rating:change', function (event, value, caption) {
                                            numberOfLikedPhones++
                                            logger.likedPhones.push(phonelist[phoneIndex].id)

                                            //perform update model request

                                            var dialogNum = logger.dialog.length
                                            var dialog = logger.dialog[dialogNum - 1]


                                            var updateData = {}
                                            updateData.user = usermodel.user
                                            updateData.logger = {}
                                            updateData.logger.latest_dialog = [dialog]
                                            updateData.logger.viewedPhones = logger.viewedPhones
                                            updateData.logger.likedPhones = logger.likedPhones
                                            var viewedPhonesLength = logger.viewedPhones.length
                                            updateData.topRecommendedPhone = logger.viewedPhones[viewedPhonesLength - 1]

                                            console.log(updateData)
                                            //TODO: need to rewrite the function updateUserModel according to the new model
                                            // updateUserModel(updateData)

                                            $("#" + logger.viewedPhones.slice(-1)[0].id + " .rating").rating('refresh', {
                                                disabled: true,
                                                showClear: false,
                                                showCaption: true
                                            });

                                            $("#" + logger.viewedPhones.slice(-1)[0].id + "> .fa-close").hide()

                                            if (numberOfLikedPhones < 5) {
                                                $("input#message").attr("disabled", false)
                                                $("input#message").attr("placeholder", "")
                                                updateChat(robot, "Here is another our recommended phone.", "Continue_Recommend");
                                                showPhone(phonelist[phoneIndex].id)

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
                                                console.log("uploaded log: ", data)
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
                                logger.dislikedPhones.push(phonelist[phoneIndex].id)

                                //Check if SC should be triggered
                                var updateData = {}
                                updateData.logger = logger
                                var viewedPhonesLength = logger.viewedPhones.length
                                updateData.topRecommendedPhone = logger.viewedPhones[viewedPhonesLength - 1]

                                showPhone(phonelist[phoneIndex].id)

                                checkSystemCritiques(updateData).then(function (returnedData) {
                                    var enableSC = JSON.parse(returnedData).triggerSC

                                    if (enableSC && sysCritVersion!="base") {
                                        var line = $('<div class="speak"><div class="spinner"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div></div>');
                                        chat.append(line);

                                        getSysCrit_mocked()
                                        //getSysCrit()

                                    } else {

                                        showNextPhone2 = setTimeout(function () {
                                            $("#speak" + id + " div").fadeOut();
                                            if (viewedPhones.indexOf(phonelist[phoneIndex]) < 0) {
                                                viewedPhones.push(phonelist[phoneIndex])

                                                setTimeout(function () {
                                                    showPhone(phonelist[phoneIndex].id)
                                                }, 1000)

                                            } else {
                                                showPhone(phonelist[phoneIndex].id)
                                            }
                                        }, 10)

                                    }

                                })

                            })

                            $("#speak" + id + " #suggest").click(function () {

                                nextTimes = 0
                                $("#speak" + id + " .feedback-box").fadeOut()
                                updateChat(you, "I need some suggestions.", "Let_bot_suggest", "btn")
                                $("#speak" + id + " div").fadeOut();
                                var line = $('<div class="speak"><div class="spinner"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div></div>');
                                chat.append(line);

                                getSysCrit_mocked()
                                //getSysCrit()
                            })
                            chat.stop().animate({
                                scrollTop: chat.prop("scrollHeight")
                            });

                        }, 500)

                    line.addClass("other")
                    chat.append(line);
                    chat.stop().animate({
                        scrollTop: chat.prop("scrollHeight")
                    });

                    topRecommendedPhone = phonelist[0]
                    phonelist.splice(phoneIndex, 1)

                }, 1000)

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
                        // clearTimeout(showFeedback)
                        // clearTimeout(showNextPhone)
                        // clearTimeout(showCurrentPhone)
                        // clearTimeout(showCurrentPhone2)
                        // clearTimeout(showNextPhone3)
                        nextTimes = 0
                        socket.emit('chat message', text);
                        updateChat(you, text, "User_Critique", "typing");

                        if (text.indexOf("next") > -1) {
                            showPhone(phonelist[phoneIndex].id)
                        }
                    }
                }
            })

            function updateAndGetRec(critique) {
                return new Promise(function (resolve, reject) {

                    var dialogNum = logger.dialog.length

                    var dialog = logger.dialog[dialogNum - 1]

                    dialog.critique = critique
                    dialog.critiqued_phone = topRecommendedPhone.id

                    //perform update model request
                    var updateData = {}
                    updateData.user = usermodel.user
                    updateData.logger = {}
                    updateData.logger.latest_dialog = [dialog]
                    updateData.logger.viewedPhones = logger.viewedPhones

                    var viewedPhonesLength = logger.viewedPhones.length
                    updateData.topRecommendedPhone = logger.viewedPhones[viewedPhonesLength - 1]

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

            function updateRecommendation(agent, text, action) {

                updateChat(agent, text, action, "text");

                if (viewedPhones.indexOf(topRecommendedPhone) < 0) {
                    viewedPhones.push(topRecommendedPhone)
                    setTimeout(function () {
                        var explanation = ""

                        if (agent == "you") {
                            explanation = "We recommend this phone because you like "
                        }
                        if (explanation)
                            updateChat(robot, explanation, "Explain")

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
            function callDialogFlow(text) {

                console.log(text)

                var intent = text.intent.displayName;
                var response_speech = text.fulfillmentText;

                console.log(text)

                //search by phone attributes
                if (intent.indexOf("smalltalk")>-1){
                    updateChat(robot, response_speech, "Small_talk", "text");
                }

                //TODO: need to parse the response from dialog based on "action" and "attribute", and other attributes
                // text.parameters.fields
                // critique-action: {stringValue: 'high', kind: 'stringValue'}
                // phone-attribute: {stringValue: 'resolution', kind: 'stringValue'}
                // phone-brand: {stringValue: '', kind: 'stringValue'}
                // phone-net: {stringValue: '', kind: 'stringValue'}
                // phone-os: {stringValue: '', kind: 'stringValue'}
                else if(intent == "phone_search_attribute") {
                    updateChat(robot, response_speech, "user_critique", "text");

                    //TODO: need to show a proper phone based on critiques
                    showPhone(phonelist[phoneIndex].id)
                }

                else if (!intent) {
                }

            }

            socket.on('bot reply', function (data) {
                callDialogFlow(data)
            });

        },
        error: function (jqXHR, err) {
            console.log(err);
            if (err === "timeout") {
                $.ajax(this)
            }
        },

    });
})