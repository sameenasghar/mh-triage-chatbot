//==============
// npm Modules
//=============

// Loads the environment variables from the .env file
require('dotenv-extended').load();

var builder = require('botbuilder');
var restify = require('restify');
var sentimentService = require('./sentiment-service');
var keywordService = require('./keyword-service');

var Connection = require('tedious').Connection;
var Request = require('tedious').Request;

// https://www.npmjs.com/package/dateformat
var dateFormat = require('dateformat');
var moment = require('moment');

var mysql = require('mysql');

var dateFormatLite = require('date-format-lite');

var bcrypt = require('bcrypt');

//============
// Constants
//============

const saltRounds = 10;

//============
// Bot Setup
//============

// Setup restify Server
var server = restify.createServer();

server.listen(process.env.port || process.env.PORT || 3978, function() {
	console.log('%s listening to %s', server.name, server.url);
});

// Serve a static web page
server.get(/.*/, restify.serveStatic({
	'directory': '.',
	'default': 'index.html'
}));

// ==============================
// Connect to Azure SQL database
// ==============================

// Create connection to database
var config =
	{
		userName: 'mng17@mhtbotdb',
		password: '1PlaneFifth',
		server: 'mhtbotdb.database.windows.net',
		options:
			{
				database: 'mhtBotDB',
				encrypt: true,
			}
	}

var connection = new Connection(config);

connection.on('connect', function(err)
	{
		if(err){
			console.log(err)
		}else{
			//queryDatabase()
			console.log("Connection successful");
		}
	}
);

// ===============
// Create chat bot
// ===============

// Create connector and listen for messages
var connector = new builder.ChatConnector({
	appId: process.env.MICROSOFT_APP_ID,
	appPassword: process.env.MICROSOFT_APP_PASSWORD
});

var bot = new builder.UniversalBot(connector, [
	function(session){
		session.send('Hi, I\'m MaxBot. I hope we\'ll be able to work together to help you');
		session.beginDialog('login');
	}
]);

server.post('/api/messages', connector.listen());

//===================
// Global Variables
//===================
var totalScore = 0;

var username = null;

var questionID = 0;

var feeling = null;

//=============
// Test Values
//=============

var userID = 1;
var username = 'Jack';

//=============
// Bot Dialogs
//=============


bot.dialog('greeting', [
	function(session, args, next){
		builder.Prompts.confirm(session, "Are you already registered?");
	},
	function(session, results){
		session.sendTyping();
		var userResponse = results.response;
		if(userResponse == true){
			session.endDialog('Great, let\'s log you in');
			session.beginDialog('login');
		}else{
			session.send('No problem. Registering is quick and easy');
			session.beginDialog('register');
		}
	}
]);

bot.dialog('register', [
	/*function(session, args, next){
		builder.Prompts.text(session, "Please enter a username of your choice:");
	},*/
	function(session, result){
		//session.dialogData.username = result.response;
		//username = session.dialogData.username;
		builder.Prompts.text(session, "Please enter a password of your choice:");
	},
	function(session, result){
		session.dialogData.password = result.response;

		var plainTextPassword = result.response;
		bcrypt.genSalt(saltRounds, function(err, salt){
			bcrypt.hash(plainTextPassword, salt, function(err, hash){
				console.log(hash);
				request = new Request(
					"INSERT INTO Users (Username, Password) VALUES (" + mysql.escape(username) + "," + mysql.escape(hash) + "); SELECT @@identity" + "",
						function(err, rowCount, rows){
							if(!err){
								console.log("User successfully inserted into table");
								session.send("Welcome" + username + "! You've succesfully registered");
								session.beginDialog('generalQs');
							}else{
								console.log("Error" + err);
							}

						}
				);
				request.on('row', function(columns){
					console.log('Newly registered user id is: %d', columns[0].value);
					session.userData.userID = columns[0].value;
					userID = session.userData.userID;
				});
				connection.execSql(request);
			});
		});
	}, 
]);


bot.dialog('login', [
	function(session, args, next){
		builder.Prompts.text(session, "Please enter your username:");

	},
	function(session,results, next){
		username = results.response;
		console.log("Username entered was " + session.userData.username);

		request = new Request(
			"SELECT UserID FROM Users WHERE Username =" + mysql.escape(username), function(err, rowCount, rows){
				if(!err){
					console.log("User exists on system");
					session.userData.username = username;
					next();
				}else{
					console.log("User does not exist on system");
				}
			}
		);
	},
	function(session){
		builder.Prompts.text(session, "Thanks. Now please enter your password:");
	},
	function(session, result){
		session.dialogData.password = result.response;
		var plainTextPassword = result.response;

		request = new Request(
			"SELECT UserID, Password FROM Users WHERE Username =" +  mysql.escape(session.userData.username),
				function(err, rowCount, rows){
				if(!err){
					console.log("Returned user password from database");
					console.log("no error");
					if(rowCount>0){
						console.log("Results were returned");
						console.log(rows);
						console.log("Number of rows returned: " + rowCount);

						//console.log("User %s logged in.", session.dialogData.username);
						//session.endDialog("Welcome back %s!", session.dialogData.username);
						//session.beginDialog('generalQs');
					}else{
						session.endDialog("Your username or password is incorrect");
					}
				}else{
					console.log("error" + err);
				}
			}
		);
		request.on('row', function(columns){
			console.log("Logged in user userID is: " + columns[0].value);
			console.log("Password from db is: " + columns[1].value);
			var hash = columns[1].value;
			bcrypt.compare(plainTextPassword, hash, function(err, res){
				if(res === true){
					console.log("Passwords match");
				}else{
					console.log("Passwords do not match");
				}
			});
			session.userData.userID = columns[0].value;
			userID = session.userData.userID;
		});
		connection.execSql(request);
	}
]);




//============
// Functions
//============

function getBotMsgTime(session){
	var botTime = new Date(session.userData.lastMessageSent);
	var botTimeFormatted = dateFormat(botTime, "yyyy-mm-dd HH:MM:ss");
	//var botTimeFormatted = botTime.format("yyyy-mm-dd HH:MM:ss");

	console.log("Bot messaged at: " + botTimeFormatted);
	return botTimeFormatted;
}

function getUserMsgTime(session){
	var userTime = new Date(session.message.localTimestamp);
	var userTimeFormatted = dateFormat(userTime, "yyyy-mm-dd HH:MM:ss");
	//var userTimeFormatted = userTime.format("yyyy-mm-dd HH:MM:ss");

	console.log("User responded at: " + userTimeFormatted);
	return userTimeFormatted;
}


function getTimeLapse(session){
	var botTime = new Date(session.userData.lastMessageSent);
	var userTime = new Date(session.message.localTimestamp);
	console.log("Time Lapse Info:");
	var timeLapseMs = userTime - botTime;
	console.log("Time lapse in ms is: " + timeLapseMs);
	var timeLapseHMS = convertMsToHMS(timeLapseMs);
	console.log("Time lapse in HH:MM:SS: " + timeLapseHMS);
	return timeLapseHMS;
}

function replaceSingleQuotes(str){
	str = str.replace("'", "''");
	console.log(str);
	return str;
}

function insertIntoUserResponses(userResponse){
	return new Promise(
		function(resolve, reject){
			request = new Request(
				"INSERT INTO UserResponses (UserResponse) VALUES ('" + replaceSingleQuotes(userResponse) + "'); SELECT @@identity",
				function(err, rowCount, rows){
					if(!err){
						console.log("user response successfully inserted into UserResponses");
					}else{
						console.log("Error in inserting into UserResponsesNews:" + err);
					}
				}
			);

			request.on('row', function(columns){
				console.log("new interactionID in function is " + columns[0].value);
				returnSentiment(userResponse, columns[0].value);
				//returnKeywords(userResponse, columns[0].value);
				resolve(columns[0].value);
			});

			connection.execSql(request);
	});
}

function processGeneralQResponse(session, response, questionID){
	// Gets timestamp information
	var botTimeFormatted = new Date(getBotMsgTime(session));
	var userTimeFormatted = new Date(getUserMsgTime(session));
	var timeLapseHMS = getTimeLapse(session);

	// inserts data into UserReponses table 
	insertIntoUserResponses(response)
		// Using the interactionID created by the insertion, inserts the user response data into the other relevant tables
		.then(function(interactionID){ 
			insertGeneralQResponseData(interactionID, botTimeFormatted, userTimeFormatted, timeLapseHMS, questionID, userID, response)
			
		})
		.catch(function(error){console.log("error in promise function catch statement" + error)});
}

function insertGeneralQResponseData(interactionID, botTime, userTime, timeLapse, questionID, userID, userResponse){
		request = new Request(
		"INSERT INTO Timestamps (InteractionID, BotMsgTime, UserMsgTime, TimeLapse) " 
			+ "VALUES (" + mysql.escape(interactionID) + "," + mysql.escape(botTime) + "," + mysql.escape(userTime) + "," + mysql.escape(timeLapse) + "); " 
		+ "INSERT INTO InteractionQuestionIDs (InteractionID, QuestionID) "
			+ "VALUES (" + mysql.escape(interactionID) + "," + mysql.escape(questionID) + ");"
		+ "INSERT INTO UserInteractions (InteractionID, UserID) "
			+ "VALUES (" + mysql.escape(interactionID) + "," + mysql.escape(userID) + "); ",
				function(err, rowCount, rows){
					if(!err){
						console.log("Data succesfully inserted into tables: Timestamps, InteractionQuestoinIDs, UserInteractions");
					}else{
						console.log("Error in inserting GeneralQResponseData" + err);
					}
				}
		);
		connection.execSql(request);
}

function recogniseFeeling(text){
	return new Promise(
		function(resolve, reject){
			builder.LuisRecognizer.recognize(text, process.env.LUIS_MODEL_URL,
				function(err, intents, entities, compositeEntities){
					console.log("Now in recogniseFeeling() function");

					console.log("Intents and confidence scores identified are:");
					console.log(intents);
					console.log("Intent with highest confidence score is:");
					console.log(intents[0]);
					console.log("Entities identified are:");
					console.log(entities);

					var depressed = false;
					var anxious = false;
					var happy = false;

					console.log("Number of entities identified");
					console.log(entities.length);

					//if(intents[0] != null && intents[0].intent = 'Feeling' && entities

					if(intents[0]!=null && entities[0]!=null){
						console.log("At least one intent and entity have been identified");

						for(i=0; i<entities.length; i++){
							if(entities[i].type == 'Depressed'){
								depressed = true;
								console.log("'Depressed' entity recognised");
							}else if(entities[i].type == 'Anxious'){
								anxious = true;
								console.log("'Anxious' entity recognised");
							}else if(entities[i].type == 'Happy'){
								happy = true;
								console.log("'Happy' entity recognised");
							}
						}

						if(depressed == true && anxious == true){
							feeling = 'DepressedAndAnxious';
							console.log("Global variable 'feeling' set to 'DepressedAndAnxious'");
						}else if(depressed == true){
							feeling = 'Depressed';
							console.log("Global variable 'feeling' set to 'Depressed'");
						}else if(anxious == true){
							feeling = 'Anxious';
							console.log("Global variable 'feeling' set to 'Anxious'");
						}else if(happy == true){
							feeling = 'Happy';
							console.log("Global variable 'feeling' set to 'Happy'");
						}

						resolve(feeling);
					}else{
						console.log("One of the following occured: no intents identified; no entities were identified");
						reject();
					}
				}
			);
		}
	);
}


function generateBotGeneralQResponse(feeling){
	console.log("In generateBotGeneralResponse() dialog");
	if(feeling == 'Depressed' || feeling == 'Anxious' || feeling == 'DepressedAndAnxious'){
		return "I'm sorry to hear you're feeling that way.";
	}else if(feeling == 'Happy'){
		return "That's great to hear! Think about what made you happy and do it again.";
	}else{
		return "Thank you.";
	}
}

//-----------------------//
// clarifyFeeling Dialog
//----------------------//
bot.dialog('clarifyFeeling', [
	function(session){
		console.log("Beginning 'clarifyFeeling' dialog");
		session.userData.lastMessageSent = new Date();
		builder.Prompts.text(session, "To work out how to best help you, would you be able to be able to tell me what the bigger problem is for you right now? Is it feeling low, or anxiety, or a combination of both? Or, if you're happy, I'd like to know about that too.");
	},
	function(session, results, next){
		recogniseFeeling(session.message.text)
			.then(function(entity){ 
				var botResponse = generateBotQuestionnaireResponse(entity);
				session.send("Thank you");
				next();
			})
			.catch(function(error){ 
				console.log("No entities identified" + error);
				session.beginDialog('clarifyFeeling');
			});
	},
	function(session, results, next){
		var questionID = 2;
		processGeneralQResponse(session, results.response, questionID);
		next();
	},
	function(session){
		session.endDialog();
	}
]);

//------------------//
//GeneralQs Dialog
//------------------//
bot.dialog('generalQs', [
	function(session, args, next){
		session.userData.lastMessageSent = new Date();
		builder.Prompts.text(session, 'How are you feeling today?');
	},
	function(session, results, next){ 
		session.dialogData.userResponse = results.response;
		recogniseFeeling(session.message.text)
			.then(function(feeling){ 
				var botResponse = generateBotGeneralQResponse(feeling);
				session.send(botResponse);
				if(feeling == 'Happy'){
					session.endDialog("I'll say goodbye for now " + username + " but just say hello when you'd like to speak again :)");
				}else{
					next();
				}
			})
			.catch(function(error){
				var botResponse = generateBotGeneralQResponse('no entity'); 
				session.send(botResponse);
				console.log("No entities identified" + error);
				session.beginDialog('clarifyFeeling');
			});
	},
	function(session, results, next){
		var questionID = 1;
		console.log("Feeling is:");
		console.log(feeling);
		processGeneralQResponse(session, session.dialogData.userResponse, questionID);
		//processUserResponseNew(session, results.response, questionNo);
		next();
	},/*
	function(session, args, next){
		// https://stackoverflow.com/questions/42069081/get-duration-between-the-bot-sending-the-message-and-user-replying
		session.userData.lastMessageSent = new Date();
		builder.Prompts.text(session, 'What has led you to seek an assessment for how you\'re feeling?');
	}, 

	function(session, results, next){
		var questionID = 3;
		processGeneralQResponse(session, results.response, questionID);
		next();
	},
	function(session){
		session.userData.lastMessageSent = new Date();
		session.sendTyping();
		builder.Prompts.text(session, 'Can you identify anything in particular that might have triggered any negative thoughts and feelings?');
	},
	function(session, results, next){
		var questionID = 4;
		processGeneralQResponse(session, results.response, questionID);
		next();
	},
	function(session){
		session.userData.lastMessageSent = new Date();
		builder.Prompts.text(session, 'What have these thoughts and feelings stopped you doing?');
	},
	function(session, results, next){
		var questionID = 5;
		processGeneralQResponse(session, results.response, questionID);
		next();
	},
	function(session){
		session.userData.lastMessageSent = new Date();
		builder.Prompts.confirm(session, 'Do you have a care plan?');
	},
	function(session, results, next){
		var questionNo = 4;
	var userResponse = results.response;
		var questionID = 6;
		processGeneralQResponse(session, session.message.text, questionID);
	//processUserResponseNew(session, session.message.text, questionNo);

	//processUserResponse(session, session.message.text, 4);
		if(userResponse == true){
			session.userData.lastMessageSent = new Date();
			builder.Prompts.text(session, 'Is it working for you?');
		}else{
			next();
		}
	},
	function(session, results, next){
		var questionID = 7;
		processGeneralQResponse(session, session.message.text, questionID);
		//processUserResponseNew(session, session.message.text, questionNo);
		//processUserResponse(session, results, 5);
		session.send("Thank you for answering these questions " + username + ".");
		next();
	},*/
	function(session){
		if(feeling == 'Depressed' || feeling == 'DepressedAndAnxious'){
			session.beginDialog('phq9');
		}else{
			session.beginDialog('gad7');
		}
	}
]);


//--------------------//
// clarifyDays Dialog
//--------------------//
bot.dialog('clarifyDays', [
	function(session){
		console.log("Beginning 'clarifyDays' dialog");
		builder.Prompts.text(session, "I'm sorry, I didn't quite get that. Please try and give a specific number of days.");
	},
	function(session, results, next){
		recogniseDayEntity(session.message.text)
			.then(function(entity){ 
				var botResponse = generateBotQuestionnaireResponse(entity);
				session.send("Thank you");
				next();
			})
			.catch(function(error){ 
				console.log("No entities identified" + error);
				session.beginDialog('clarifyDays');
			});
	},
	function(session){
		session.endDialog();
	}
]);

//---------------------------//
// clarifyDifficulty Dialog
//---------------------------//
bot.dialog('clarifyDifficulty', [
	function(session){
		console.log("Beginning 'clarifyDifficult' dialog");
		builder.Prompts.text(session, "I'm sorry, I didn't quite get that. Would you say you these problems have not caused any difficult in doing your work, taking care of things at home, or getting along with other people? Or would say you they have made these things extremely difficult, very difficult, or somewhat difficult?.");
	},
	function(session, results, next){
		recogniseDayEntity(session.message.text)
			.then(function(entity){ 
				var botResponse = generateBotQuestionnaireResponse(entity);
				session.send("Thank you");
				next();
			})
			.catch(function(error){ 
				console.log("No entities identified" + error);
				session.beginDialog('clarifyDays');
			});
	},
	function(session){
		session.endDialog();
	}
]);

//------------------//
// gad7 Dialog
//------------------//
bot.dialog('gad7', [
	function (session, args, next){
		console.log('Beginning gad7 dialog');
		totalScore = 0;
		if(feeling == 'Anxious'){
			builder.Prompts.confirm(session, "I'm now going to take you through a clinical process that will help you to explain how you feel to a clinician. Is that ok?");
		}else{
			builder.Prompts.confirm(session, "There's another clinical process that could also help you. Would you like to do this one as well?");
		}
	},
	function(session, results, next){
		var userResponse = results.response;
		if(userResponse == true){
			session.send("Great!");
			next();
		}else{
			session.endDialog("No problem, just come back and say hello when you feel ready to try this. Hope to speak to you again soon " + username + "!");
		}
	},
	function(session){
		console.log("Asking phq9 q1");
		session.userData.lastMessageSent = new Date();
		builder.Prompts.text(session, "In the past two weeks, how many days have you felt nervous, anxious, or on edge?");
	}, /*
	function(session, results, next){ 
		session.dialogData.userResponse = results.response;
		recogniseDayEntity(session.message.text)
			.then(function(entity){ 
				var botResponse = generateBotQuestionnaireResponse(entity);
				session.send(botResponse);
				next();
			})
			.catch(function(error){ 
				console.log("No entities identified" + error);
				session.beginDialog('clarifyDays');
			});
	},*/
		function(session, results, next){
		var severity = getSeverity(totalScore);
		console.log("The user's score of %i indicates that the user has %s depression", totalScore, severity);
		session.send('Thanks for answering these questions ' + username + '.');
		next();
	},
	function(session, results, next){
		session.send('You\'ve just been through the GAD-7 questionnaire. Your score is %i, which will be useful for a clinician. Please do this questionnaire regularly over the next two weeks and, if you don\'t feel you\'ve improved, share your score and your responses with a clinician', totalScore);
		next();
	},
	function(session){
		session.endDialog('I\'ll say goodbye for now but just say hello when you\'d like to talk again!');
	}

]);


//------------------//
// phq9 Dialog
//------------------//
bot.dialog('phq9', [
	function (session, args, next){
		console.log('Beginning phq9 dialog');
		totalScore = 0;
		builder.Prompts.confirm(session, "I'm now going to take you through a clinical process that will help you to explain how you feel to a clinician. Is that ok?");
		//session.send("I'm now going to ask you some questions about how you've felt over the past two weeks");
	},
	function(session, results, next){
		var userResponse = results.response;
		if(userResponse == true){
			session.send("Great!");
			next();
		}else{
			session.endDialog("No problem! Come back when you feel ready to try this.");
		}
	},
	function(session){
		console.log("Asking phq9 q1");
		session.userData.lastMessageSent = new Date();
		builder.Prompts.text(session, "In the past two weeks, how many days have you had little interest or pleasure in doing things?");
	}, 
	function(session, results, next){ 
		session.dialogData.userResponse = results.response;
		recogniseDayEntity(session.message.text)
			.then(function(entity){ 
				var botResponse = generateBotQuestionnaireResponse(entity);
				session.send(botResponse);
				next();
			})
			.catch(function(error){ 
				console.log("No entities identified" + error);
				session.beginDialog('clarifyDays');
			});
	},/*
	function(session, results, next){
		var questionID = 7;
		console.log("in question 7 storage area");
		processQuestionnaireResponse(session, session.dialogData.userResponse, 'phq9', questionID);
		next();
	},
	function(session, next){
		console.log("phq9 q2");
		session.userData.lastMessageSent = new Date();
		builder.Prompts.text(session, "In the past two weeks, how many days have you felt down, depressed, or hopeless?");
	},
	function(session, results, next){ 
		session.dialogData.userResponse = results.response;
		recogniseDayEntity(session.message.text)
			.then(function(entity){ 
				var botResponse = generateBotQuestionnaireResponse(entity);
				session.send(botResponse);
				next();
			})
			.catch(function(error){ 
				console.log("No entities identified" + error);
				session.beginDialog('clarifyDays');
			});
	},
	function(session, results, next){ 
		var questionID = 8;
		processQuestionnaireResponse(session, session.dialogData.userResponse, 'phq9', questionID);
		next();
	},
	function(session, next){
		session.userData.lastMessageSent = new Date();
		builder.Prompts.text(session, 'In the past two weeks, how many days have you had trouble falling or staying asleep, or sleeping too much?');
	},
	function(session, results, next){ 
		session.dialogData.userResponse = results.response;
		recogniseDayEntity(session.message.text)
			.then(function(entity){ 
				var botResponse = generateBotQuestionnaireResponse(entity);
				session.send(botResponse);
				next();
			})
			.catch(function(error){ 
				console.log("No entities identified" + error);
				session.beginDialog('clarifyDays');
			});
	},
	function(session, results, next){ 
		var questionID = 9;
		processQuestionnaireResponse(session, session.dialogData.userResponse, 'phq9', questionID);
		next();
	},
	function(session, next){
		session.userData.lastMessageSent = new Date();
		builder.Prompts.text(session, "In the past two weeks, how many days, how many days were you bothered by feeling tired or having little energy?");
	},
	function(session, results, next){ 
		session.dialogData.userResponse = results.response;
		recogniseDayEntity(session.message.text)
			.then(function(entity){ 
				var botResponse = generateBotQuestionnaireResponse(entity);
				session.send(botResponse);
				next();
			})
			.catch(function(error){ 
				console.log("No entities identified" + error);
				session.beginDialog('clarifyDays');
			});
	},
	function(session, results, next){ 
		var questionID = 10;
		processQuestionnaireResponse(session, session.dialogData.userResponse, 'phq9', questionID);
		next();
	},
	function(session, next){
		session.userData.lastMessageSent = new Date();
		builder.Prompts.text(session, "In the past two weeks, how many days have you had a poor appetite or overeaten?");
	}, 
	function(session, results, next){ 
		session.dialogData.userResponse = results.response;
		recogniseDayEntity(session.message.text)
			.then(function(entity){ 
				var botResponse = generateBotQuestionnaireResponse(entity);
				session.send(botResponse);
				next();
			})
			.catch(function(error){ 
				console.log("No entities identified" + error);
				session.beginDialog('clarifyDays');
			});
	},
	function(session, results, next){ 
		var questionID = 11;
		processQuestionnaireResponse(session, session.dialogData.userResponse, 'phq9', questionID);
		next();
	},
	function(session, next){
		session.userData.lastMessageSent = new Date();
		builder.Prompts.text(session, "In the past two weeks, how many days have you felt bad about yourself - or that you are a failure or have let yourself or your family down?");
	}, 
	function(session, results, next){ 
		session.dialogData.userResponse = results.response;
		recogniseDayEntity(session.message.text)
			.then(function(entity){ 
				var botResponse = generateBotQuestionnaireResponse(entity);
				session.send(botResponse);
				next();
			})
			.catch(function(error){ 
				console.log("No entities identified" + error);
				session.beginDialog('clarifyDays');
			});
	},
	function(session, results, next){ 
		var questionID = 12;
		processQuestionnaireResponse(session, session.dialogData.userResponse, 'phq9', questionID);
		next();
	},
	function(session, next){
		session.userData.lastMessageSent = new Date();
		builder.Prompts.text(session, "In the past two weeks, how many days have you had trouble concentrating on things, such as reading the newspaper or watching television?");
	}, 
	function(session, results, next){ 
		session.dialogData.userResponse = results.response;
		recogniseDayEntity(session.message.text)
			.then(function(entity){ 
				var botResponse = generateBotQuestionnaireResponse(entity);
				session.send(botResponse);
				next();
			})
			.catch(function(error){ 
				console.log("No entities identified" + error);
				session.beginDialog('clarifyDays');
			});
	},
	function(session, results, next){ 
		var questionID = 13;
		processQuestionnaireResponse(session, session.dialogData.userResponse, 'phq9', questionID);
		next();
	},
	function(session, next){
		session.userData.lastMessageSent = new Date();
		builder.Prompts.text(session, "In the past two weeks, how many days have you moved or spoken so slowly that other people could have noticed? Or the opposite - been so fidgety or restless that you've been moving around a lot more than usual?");
	}, 
	function(session, results, next){ 
		session.dialogData.userResponse = results.response;
		recogniseDayEntity(session.message.text)
			.then(function(entity){ 
				var botResponse = generateBotQuestionnaireResponse(entity);
				session.send(botResponse);
				next();
			})
			.catch(function(error){ 
				console.log("No entities identified" + error);
				session.beginDialog('clarifyDays');
			});
	},
	function(session, results, next){ 
		var questionID = 14;
		processQuestionnaireResponse(session, session.dialogData.userResponse, 'phq9', questionID);
		next();
	},

	function(session, next){
		session.userData.lastMessageSent = new Date();
		builder.Prompts.text(session, "In the past two weeks, how many days, how often have you had thoughts that you'd be better off dead or of hurting yourself in some way?");
	},
	function(session, results, next){ 
		session.dialogData.userResponse = results.response;
		recogniseDayEntity(session.message.text)
			.then(function(entity){ 
				var botResponse = generateBotQuestionnaireResponse(entity);
				session.send(botResponse);
				next();
			})
			.catch(function(error){ 
				console.log("No entities identified" + error);
				session.beginDialog('clarifyDays');
			});
	},
	function(session, results, next){ 
		var questionID = 15;
		processQuestionnaireResponse(session, session.dialogData.userResponse, 'phq9', questionID);
		next();
	},
	function(session, next){
		session.userData.lastMessageSent = new Date();
		builder.Prompts.text(session, "How difficult have any of these problems made it for you to do your work, take care of things at home, or get along with other people?");
	},
	function(session, results, next){ 
		session.dialogData.userResponse = results.response;
		recogniseDifficultyEntity(session.message.text)
			.then(function(entity){ 
				next();
			})
			.catch(function(error){ 
				console.log("No entities identified" + error);
				session.beginDialog('clarifyDifficulty');
			});
	},
	function(session, results, next){
		var questionID = 16;
		processDifficultyResponse(session, session.dialogData.userResponse, 'phq9', questionID);
		next();
	},*/
	function(session, results, next){
		var severity = getSeverity(totalScore);
		console.log("The user's score of %i indicates that the user has %s depression", totalScore, severity);
		session.send('Thank you for answering these questions. You\'ve just been through the PHQ-9 questionnaire. Your score is %i, which will be useful for a clinician.', totalScore);
		next();
	},
	function(session, results, next){
		session.send('Please do this questionnaire regularly over the next two weeks and, if you don\'t feel you\'ve improved, share your score and your responses with a clinician');
		next();
	},
	function(session){
		if(feeling == 'Depressed'){
			session.endDialog('Speak to you again soon!');
		}else if(feeling == 'DepressedAndAnxious'){
			session.beginDialog('gad7');
		}
	}

]);

//============
// Functions
//============

function insertQuestionnaireResponseData(interactionID, botTime, userTime, timeLapse, questionID, userID, userResponse, questionnaireType, qScore){
	request = new Request(
		"INSERT INTO Timestamps (InteractionID, BotMsgTime, UserMsgTime, TimeLapse) " 
			+ "VALUES (" + mysql.escape(interactionID) + "," + mysql.escape(botTime) + "," + mysql.escape(userTime) + "," + mysql.escape(timeLapse) + "); " 
		+ "INSERT INTO InteractionQuestionIDs (InteractionID, QuestionID) "
			+ "VALUES (" + mysql.escape(interactionID) + "," + mysql.escape(questionID) + ");"
		+ "INSERT INTO UserInteractions (InteractionID, UserID) "
			+ "VALUES (" + mysql.escape(interactionID) + "," + mysql.escape(userID) + "); "
		+ "INSERT INTO QuestionScores(InteractionID, QuestionnaireType, Score) "
			+ "VALUES (" + mysql.escape(interactionID) + "," + mysql.escape(questionnaireType) + "," + mysql.escape(qScore) + ");",
				function(err, rowCount, rows){
					if(!err){
						console.log("Questionnaire user response data successfully inserted into tables: Timestamps, InteractionQuestionIDs, UserInteractions, QuestionScores, TotalScores");
					}else{
						console.log("Error in inserting data" + err);
					}
				}
	);
	connection.execSql(request);
}

function insertQuestionnaireEndData(interactionID, botTime, userTime, timeLapse, questionID, userID, userResponse, questionnaireType, totalScore, difficultyEntity){
	request = new Request(
		"INSERT INTO Timestamps (InteractionID, BotMsgTime, UserMsgTime, TimeLapse) " 
			+ "VALUES (" + mysql.escape(interactionID) + "," + mysql.escape(botTime) + "," + mysql.escape(userTime) + "," + mysql.escape(timeLapse) + "); " 
		+ "INSERT INTO InteractionQuestionIDs (InteractionID, QuestionID) "
			+ "VALUES (" + mysql.escape(interactionID) + "," + mysql.escape(questionID) + ");"
		+ "INSERT INTO UserInteractions (InteractionID, UserID) "
			+ "VALUES (" + mysql.escape(interactionID) + "," + mysql.escape(userID) + "); "
		+ "INSERT INTO TotalScores (UserID, TotalScore, DateCompleted, Difficulty) "
			+ "VALUES (" + mysql.escape(userID) + "," + mysql.escape(totalScore) + "," + mysql.escape(userTime) + "," + mysql.escape(difficultyEntity) + ");",
				function(err, rowCount, rows){
					if(!err){
						console.log("Completed questionnaire user response data successfully inserted into tables: Timestamps, InteractionQuestionIDs, UserInteractions, TotalScores");
					}else{
						console.log("Error in inserting data" + err);
					}
				}
	);
	connection.execSql(request);
}


function recogniseDayEntity(text){
	return new Promise(
		function(resolve, reject){
			builder.LuisRecognizer.recognize(text, process.env.LUIS_MODEL_URL,
				function(err, intents, entities, compositeEntities){
					console.log("Now in LUIS Recogniser in recogniseDayEntity() function");
					var qScore = 0;

					console.log("Intents and confidence scores identified are:");
					console.log(intents);
					console.log("Intent with highest confidence score is:");
					console.log(intents[0]);
					console.log("Entities identified are:");
					console.log(entities);

					if(intents[0] != null && intents[0].intent == 'Days' && entities[0] !=null){
						console.log("Intent is 'Days' and a relevant entity has been identified");
						console.log("Highest confidence entity identified is:"); 
						console.log(entities[0]);

						var entity = entities[0].type;
						console.log("Entity recognised is: %s", entities[0].type);

						resolve(entity);
					}else{
						console.log("One of the following occured: no intents identified; intent identified was not 'Days'; no entities were identified");
						qScore = 0;
						reject();
					}
				});
		});
}

function recogniseDifficultyEntity(text){
	return new Promise(
		function(resolve, reject){
			builder.LuisRecognizer.recognize(text, process.env.LUIS_MODEL_URL,
				function(err, intents, entities, compositeEntities){
					console.log("Now in recogniseDifficultyEntity() function");
					var qScore = 0;

					console.log("Intents and confidence scores identified are:");
					console.log(intents);
					console.log("Intent with highest confidence score is:");
					console.log(intents[0]);
					console.log("Entities identified are:");
					console.log(entities);

					if(intents[0] != null && intents[0].intent == 'Difficulty' && entities[0] != null){
						console.log("Intent is 'Difficulty' and a relevant entity has been identified");
						console.log("Highest confidence entity identified is:");
						console.log(entities[0]);

						var entity = entities[0].type;
						console.log("Entity recognised is: %s:", entities[0].type);

						resolve(entity);
					}else{
						console.log("One of the following occured: no intents identified; intentt identified was not 'Difficulty'; no entities were identified");
						qScore = 0;
						reject();
					}
				}
			);
		}
	);
}


function processQuestionnaireResponse(session, results, questionnaireType, questionID){
	var userResponse = results;
	var botTimeFormatted = new Date(getBotMsgTime(session));
	var userTimeFormatted = new Date(getUserMsgTime(session));
	var timeLapseHMS = getTimeLapse(session);

	builder.LuisRecognizer.recognize(session.message.text, process.env.LUIS_MODEL_URL,
		function(err, intents, entities, compositeEntities){
			console.log("Now in LUIS Recognizer in processQuestionnaireResponse() function");
			var qScore = 0;

			console.log("Intents and confidence scores identified are:");
			console.log(intents);
			console.log("Intent with highest certainty is:");
			console.log(intents[0]);
			console.log("Entities identified are:");
			console.log(entities);

			if(intents[0] != null && intents[0].intent == 'Days' && entities[0] !=null){
				console.log("Intent is \'Days\' and a relevant entity has been identified");
				console.log("Highest confidence entity identified is:"); 
				console.log(entities[0]);

				var entity = entities[0].type;
				console.log("Entity recognised is: %s", entities[0].type);

				qScore = getScore(entity);
				console.log("individual question score is: " + qScore);

				totalScore+=getScore(entity);
				console.log("Total score after this question is %i", totalScore);
			}else{
				console.log("One of the following occured: no intents identified; intent identified was not 'Days'; no entities were identified");
				qScore = 0;
			}

			insertIntoUserResponses(userResponse)
				.then(function(interactionID){ 
					insertQuestionnaireResponseData(interactionID, botTimeFormatted, userTimeFormatted, timeLapseHMS, questionID, userID, userResponse, questionnaireType, qScore)
					
				})
				.catch(function(error){console.log("error in promise function catch statement" + error)});
		}
	);
}

function processDifficultyResponse(session, results, questionnaireType, questionID){
	var userResponse = results;
	var botTimeFormatted = new Date(getBotMsgTime(session));
	var userTimeFormatted = new Date(getUserMsgTime(session));
	var timeLapseHMS = getTimeLapse(session);

	builder.LuisRecognizer.recognize(session.message.text, process.env.LUIS_MODEL_URL,
		function(err, intents, entities, compositeEntities){
			console.log("Now in recogniseDifficultyEntity() function");

			console.log("Intents and confidence scores identified are:");
			console.log(intents);
			console.log("Intent with highest confidence score is:");
			console.log(intents[0]);
			console.log("Entities identified are:");
			console.log(entities);

			if(intents[0] != null && intents[0].intent == 'Difficulty' && entities[0] != null){
				console.log("Intent is 'Difficulty' and a relevant entity has been identified");
				console.log("Highest confidence entity identified is:");
				console.log(entities[0]);

				var difficultyEntity = entities[0].type;
				console.log("Entity recognised is: %s:", entities[0].type);

				console.log("Final total score is after this question is %i", totalScore);
			}else{
				console.log("One of the following occured: no intents identified; intentt identified was not 'Difficulty'; no entities were identified");
			}

			insertIntoUserResponses(userResponse)
			.then(function(interactionID){ 
				insertQuestionnaireEndData(interactionID, botTimeFormatted, userTimeFormatted, timeLapseHMS, questionID, userID, userResponse, questionnaireType, totalScore, difficultyEntity);
				
			})
			.catch(function(error){
				console.log("In processDifficultyResponse() catch statement. Error: " + error)
			});
		}
	);
}


function generateBotQuestionnaireResponse(entity){
	if(entity == 'NotAtAll'){
		return "That's great! I'm so glad to hear that.";
	}else{
		return "Thank you.";
	}
}

function clarifyUserResponseQuestionnaire(){

}

function getBotResponse(entity){
	var response = null;
	if(entity == "NearlyEveryDay"){
		response = "I'm sorry to hear that";
	}else if(entity == "MoreThanHalfTheDays"){
		response = "I'm sorry to hear that";
	}else if(entity == "SeveralDays"){
		response = "Thank you";
	}else if(entity == "NotAtAll"){
		response = "I'm glad to hear that";
	}else{
		response = "I don't recognise that entity";
	}
	return response;
}

function getScore(entity){
	var score = 0;
	switch(entity){
		case 'NotAtAll':
			return 0;
			break;
		case 'SeveralDays':
			return 1;
			break;
		case 'MoreThanHalfTheDays':
			return 2;
			break;
		case 'NearlyEveryDay':
			return 3;
			break;
		default:
			return 20;
	}
}

function getSeverity(finalScore){
	var s = finalScore;
	if(s>=0 && s<=5){
		return 'mild';
	}else if(s>=6 && s<=10){
		return 'moderate';
	}else if(s>=11 && s<=15){
		return 'moderately severe';
	}else{
		return 'severe';
	}
}



//====================
// Sentiment Analysis
//====================

function returnSentiment(text, qID){
	return sentimentService
				.getSentiment(text)
				.then(function(sentiment){ handleSentimentSuccessResponse(sentiment, qID); })
				.catch(function(error){ handleErrorResponse(error); });
}

function returnKeywords(text, qID){
	return keywordService
				.getKeywords(text)
				.then(function(keywords){ handleKeywordSuccessResponse(keywords, qID); })
				.catch(function(error){ handleErrorResponse(error); });
}


//====================
// Response Handling
//====================

function handleSentimentSuccessResponse(sentimentScore, interactionID){
	if(sentimentScore){
		console.log("Sentiment Analysis successful");
		insertIntoSentimentTable(sentimentScore, interactionID);
	}else{
		console.log("Sentiment score could not get result");
	}
}

function insertIntoSentimentTable(sentimentScore, interactionID){

	request = new Request(
		"INSERT INTO Sentiment (InteractionID, SentimentScore) VALUES (" + mysql.escape(interactionID) + "," + mysql.escape(sentimentScore) + ")",
				function(err, rowCount, rows){
					if(!err){
						console.log("Sentiment score successfully inserted into Sentiments table");
					}else{
						console.log("Error in inserting into Sentiments table:" + err);
					}
				}
	);
	connection.execSql(request);
}	

function insertKeywords(keyword, qID){
	request = new Request(
		"INSERT INTO Keywords (Keyword) VALUES (" + mysql.escape(keyword) + ") WHERE QuestionID = " + mysql.escape(qID),
			function(err, rowCount, rows){
				if(!err){
					console.log("Keyword" + mysql.escape(keyword) + " successfully inserted into table");
				}else{
					console.log("Error in inserting into Keywords table" + err);
				}
			}
	);
	connection.execSql(request);
}

function handleKeywordSuccessResponse(keywords, qID){
	if(keywords){
		console.log('Keywords returned result: ' + keywords);
		var keywordsSplit = keywords.toString().split(",");
		console.log(keywordsSplit);

		request = new Request(
		"INSERT INTO Keywords (Keyword) VALUES ('water') WHERE QuestionID = " + mysql.escape(qID),
			function(err, rowCount, rows){
				if(!err){
					console.log("Keyword" + mysql.escape(keyword) + " successfully inserted into table");
				}else{
					console.log("Error" + err);
				}
			}
	);
	connection.execSql(request);

		setTimeout(function(){
			for(i=0; i<keywordsSplit.length; i++){
				insertKeywords(keywordsSplit[i], qID);
			}
		}, 200);
	}else{
		console.log('Keywords could not be obtained');
	}
}

function handleErrorResponse(session, error){
	var clientErrorMessage = 'Oops! Something went wrong. Try again later.';
    if (error.message && error.message.indexOf('Access denied') > -1) {
        clientErrorMessage += "\n" + error.message;
    }

    console.error(error);
    session.send(clientErrorMessage);
}

//===================
// Helper Functions
//===================

//https://stackoverflow.com/questions/29816872/how-can-i-convert-milliseconds-to-hhmmss-format-using-javascript
function convertMsToHMS(ms){
	var ss = ms/1000;
	var ss = ms/1000;
	var hh = parseInt(ss/3600);
	ss = ss % 3600;
	var mm = parseInt(ss/60);
	ss = ss % 60;

	return(hh + ":" + mm + ":" + ss);
}


