'use strict';

// const APIAI_TOKEN = '1493bad763ec4671b1ee6ea4a8c80452';
// const APIAI_SESSION_ID = '123456789abcdefghj';

const express = require('express'),
    path = require('path'),
    favicon = require('serve-favicon'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    session = require('express-session'),
    passport = require('passport'),
    mongoose = require('mongoose');


// var https = require('https'),
//     fs = require("fs");

// var options = {
//     key: fs.readFileSync('1644342_music-bot.top.key'),
//     cert: fs.readFileSync('1644342_music-bot.top.pem')
// };

const app = express();
var index = require('./routes/router-en');

mongoose.connect("mongodb://localhost:27017/bot", function (err) {
    if (err) {
        console.log("connection error", err);
    } else {
        console.log('connection successful!');
    }
});

app.use(express.static(__dirname + '/public')); // js, css, images
app.use(express.static(path.join(__dirname, 'bower_components')));
app.use(express.static(path.join(__dirname, 'node_modules')));
app.use(express.static(path.join(__dirname, 'backend')));

app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

app.set('trust proxy', 1); // trust first proxy

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(methodOverride());
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    //cookie:{secure:true}
}));

// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'bower_components')));
app.use(express.static(path.join(__dirname, 'node_modules')));

app.use('/', index);

const server = app.listen(process.env.PORT || 3000, () => {
    console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});

// const server = https.createServer(options, app).listen(3000, function () {
//     console.log('Https server listening on port ' + 3000);
// });

const io = require('socket.io')(server);
io.on('connection', function(socket){
    console.log('a user connected');
});

// Imports the Dialogflow library
const dialogflow = require('@google-cloud/dialogflow');

// Instantiates a session client

const projectId = "mobilephone-xlojne"
const sessionId = "123456"
const languageCode = "en-US"

/**
 * TODO(developer): UPDATE these variables before running the sample.
 */
// projectId: ID of the GCP project where Dialogflow agent is deployed
// const projectId = 'PROJECT_ID';
// sessionId: String representing a random number or hashed user identifier
// const sessionId = '123456';
// queries: A set of sequential queries to be send to Dialogflow agent for Intent Detection
// const queries = [
//   'Reserve a meeting room in Toronto office, there will be 5 of us',
//   'Next monday at 3pm for 1 hour, please', // Tell the bot when the meeting is taking place
//   'B'  // Rooms are defined on the Dialogflow agent, default options are A, B, or C
// ]
// languageCode: Indicates the language Dialogflow agent should use to detect intents
// const languageCode = 'en';

// Imports the Dialogflow library

// Instantiates a session client
const sessionClient = new dialogflow.SessionsClient();


io.on('connection', function(socket) {
    socket.on('chat message', (query) => {
        console.log('Message: ' + query);

        async function detectIntent(
            projectId,
            sessionId,
            query,
            contexts,
            languageCode
        ) {
            // The path to identify the agent that owns the created intent.
            const sessionPath = sessionClient.projectAgentSessionPath(
                projectId,
                sessionId
            );

            // The text query request.
            const request = {
                session: sessionPath,
                queryInput: {
                    text: {
                        text: query,
                        languageCode: languageCode,
                    },
                },
            };

            if (contexts && contexts.length > 0) {
                request.queryParams = {
                    contexts: contexts,
                };
            }

            const responses = await sessionClient.detectIntent(request);
            return responses[0];
        }

        async function executeQueries(projectId, sessionId, queries, languageCode) {
            // Keeping the context across queries let's us simulate an ongoing conversation with the bot
            let context;
            let intentResponse;
            try {
                console.log(`Sending Query: ${query}`);
                intentResponse = await detectIntent(
                    projectId,
                    sessionId,
                    query,
                    context,
                    languageCode
                );
                console.log('Detected intent');
                console.log(
                    `Fulfillment Text: ${intentResponse.queryResult.fulfillmentText}`
                );
                socket.emit('bot reply', intentResponse.queryResult);
                // Use the context from this response for next queries
                context = intentResponse.queryResult.outputContexts;
            } catch (error) {
                console.log(error);
            }
        }
        executeQueries(projectId, sessionId, query, languageCode);

    });
});
