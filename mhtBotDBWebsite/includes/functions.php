<?php
function formatErrors( $errors )
{
    //Display errors. 
    echo "Error information: ";

    foreach ( $errors as $error )
    {
        echo "SQLSTATE: ".$error['SQLSTATE']."";
        echo "Code: ".$error['code']."";
        echo "Message: ".$error['message']."";
    }
}

function getAllUserIDs($conn){
	$userIDs = [];
	$tsql = "SELECT UserID FROM Users;";
	$getResults = sqlsrv_query($conn, $tsql);
	if($getResults == False){
		if( ($errors = sqlsrv_errors())!=null){
			formatErrors($errors);
		}
		die("Error in executing getAllUserIDs() query");
	}

	//echo "getAllUserIDs() successfully executed";
	while($row = sqlsrv_fetch_array($getResults, SQLSRV_FETCH_ASSOC)){
		array_push($userIDs, $row['UserID']);
	}
	return $userIDs;
}

function getUsernameFromID($conn, $userID){
	$result = 0;
	$tsql = "SELECT Username FROM Users WHERE UserID = '$userID'";
	$getResults = sqlsrv_query($conn, $tsql);
	if($getResults == False){
		if( ($errors = sqlsrv_errors())!=null){
			formatErrors($errors);
		}
		die("Error in executing getUsernameFromID() query");
	}

	//echo "getUserNameFromID() query successfully executed";
	while($row = sqlsrv_fetch_array($getResults, SQLSRV_FETCH_ASSOC)){
		$result = $row['Username'];
	}
	return $result;
}

function getUserQuestionnaires($conn, $userID){
	$resultArr = [];
	$tsql = "SELECT QuestionnaireID FROM Questionnaires WHERE UserID = $userID";
	$getResults = sqlsrv_Query($conn, $tsql);
	if($getResults == FALSE)
		die("Error in executing getUserQuestionnaires() query");

	while($row = sqlsrv_fetch_array($getResults, SQLSRV_FETCH_ASSOC)){
		array_push($resultArr, $row['QuestionnaireID']);
	}
	return $resultArr;
}


function getQuestionnaireType($conn, $questionnaireID){
	$result = null;
	$tsql = "SELECT QuestionnaireType FROM Questionnaires WHERE QuestionnaireID = $questionnaireID";
	$getResults = sqlsrv_Query($conn, $tsql);
	if($getResults == FALSE)
		die("Error in executing getQuestionnaireType() query");

	while($row = sqlsrv_fetch_array($getResults, SQLSRV_FETCH_ASSOC)){
		$result = $row['QuestionnaireType'];
	}
	return $result;
}


function getQuestionnaireTotalScore($conn, $questionnaireID){
	$result = 0;
	$tsql = "SELECT TotalScore FROM TotalScores WHERE QuestionnaireID = $questionnaireID";
	$getResults = sqlsrv_Query($conn, $tsql);
	if($getResults == FALSE)
		die("Error in executing getQuestionnaireTotalScore() query");

	while($row = sqlsrv_fetch_array($getResults, SQLSRV_FETCH_ASSOC)){
		$result = $row['TotalScore'];
	}

	return $result;
}

function getQuestionnaireDateCompleted($conn, $questionnaireID){
	$result = null;
	$tsql = "SELECT DateCompleted FROM TotalScores WHERE QuestionnaireID = $questionnaireID";
	$getResults = sqlsrv_Query($conn, $tsql);
	if($getResults == FALSE)
		die("Error in executing getQuestionnaireDateCompleted() query");

	while($row = sqlsrv_fetch_array($getResults, SQLSRV_FETCH_ASSOC)){
		$result = $row['DateCompleted'];
	}
	return $result;
}

function getUserPHQ9s($conn, $userID){
	$resultArr = [];
	$tsql = "SELECT QuestionnaireID 
				FROM Questionnaires 
				WHERE UserID = $userID 
				AND QuestionnaireType = 'phq9'";
	$getResults = sqlsrv_Query($conn, $tsql);
	if($getResults == FALSE)
		die("Error in executing getUserPHQ9s() query");

	while($row = sqlsrv_fetch_array($getResults, SQLSRV_FETCH_ASSOC)){
		array_push($resultArr, $row['QuestionnaireID']);
	}
	return $resultArr;
}

function getUserGAD7s($conn, $userID){
	$resultArr = [];
	$tsql = "SELECT QuestionnaireID FROM Questionnaires WHERE UserID = $userID AND QuestionnaireType ='gad7'";
	$getResults = sqlsrv_Query($conn, $tsql);
	if($getResults == FALSE)
	die("Error in executing getUserGAD7s() query");

	while($row = sqlsrv_fetch_array($getResults, SQLSRV_FETCH_ASSOC)){
		array_push($resultArr, $row['QuestionnaireID']);
	}
	return $resultArr;
}


function getUserGeneralQs($conn, $userID){
	$resultArr = [];
	$tsql = "SELECT QuestionnaireID FROM Questionnaires WHERE UserID = $userID AND QuestionnaireType ='generalQs'";
	$getResults = sqlsrv_Query($conn, $tsql);
	if($getResults == FALSE)
	die("Error in executing getUserGAD7s() query");

	while($row = sqlsrv_fetch_array($getResults, SQLSRV_FETCH_ASSOC)){
		array_push($resultArr, $row['QuestionnaireID']);
	}
	return $resultArr;
}



function getQuestionnaireInteractionIDs($conn, $questionnaireID){
	$resultArr = [];
	$tsql = "SELECT InteractionID FROM QuestionScores WHERE QuestionnaireID = $questionnaireID";
	$getResults = sqlsrv_Query($conn, $tsql);
	if($getResults == FALSE)
		die("Error in executing getQuestionnaireInteractionIDs() query");

	while($row = sqlsrv_fetch_array($getResults, SQLSRV_FETCH_ASSOC)){
		array_push($resultArr, $row['InteractionID']);
	}
	return $resultArr;
}


function getQuestionIDFromInteractionID($conn, $interactionID){
	$result = 0;
	$tsql = "SELECT QuestionID FROM InteractionQuestionIDs WHERE InteractionID = $interactionID";
	$getResults = sqlsrv_query($conn, $tsql);
	if($getResults == False){
		if(($errors = sqlsrv_errors())!=null){
			formatErrors($errors);
		}
		die("Error in eecuting getQuestionNoFromInteractionID() query");
	}
	//echo "getResponseFromID() query successfully executed";
	while($row = sqlsrv_fetch_array($getResults, SQLSRV_FETCH_ASSOC)){
		$result = $row['QuestionID'];
	}
	return $result;
}

function getQuestionTextFromQuestionID($conn, $questionID){
	$result = null;
	$tsql = "SELECT Question FROM AllQuestions WHERE QuestionID = $questionID";
	$getResults = sqlsrv_Query($conn, $tsql);
	if($getResults == False){
		if(($errors = sqlsrv_errors())!=null){
			formatErrors($errors);
		}
		die("Error in eecuting getQuestionTextFromQuestionID() query");
	}
	//echo "getResponseFromID() query successfully executed";
	while($row = sqlsrv_fetch_array($getResults, SQLSRV_FETCH_ASSOC)){
		$result = $row['Question'];
	}
	return $result;
}

function getUserResponseFromInteractionID($conn, $interactionID){
	$result = null;
	$tsql = "SELECT UserResponse FROM UserResponses WHERE InteractionID = $interactionID";
	$getResults = sqlsrv_Query($conn, $tsql);
	if($getResults == False){
		if(($errors = sqlsrv_errors())!=null){
			formatErrors($errors);
		}
		die("Error in eecuting getQuestionTextFromQuestionID() query");
	}
	//echo "getResponseFromID() query successfully executed";
	while($row = sqlsrv_fetch_array($getResults, SQLSRV_FETCH_ASSOC)){
		$result = $row['UserResponse'];
	}
	return $result;
}

function getQuestionScore($conn, $interactionID){
	$result = null;
	$tsql = "SELECT Score FROM QuestionScores WHERE InteractionID = $interactionID";
	$getResults = sqlsrv_Query($conn, $tsql);
	if($getResults == False){
		if(($errors = sqlsrv_errors())!=null){
			formatErrors($errors);
		}
		die("Error in eecuting getQuestionScore() query");
	}
	//echo "getResponseFromID() query successfully executed";
	while($row = sqlsrv_fetch_array($getResults, SQLSRV_FETCH_ASSOC)){
		$result = $row['Score'];
	}
	return $result;
}

function getSentimentScore($conn, $interactionID){
	$result = null;
	$tsql = "SELECT SentimentScore FROM Sentiment WHERE InteractionID = $interactionID";
	$getResults = sqlsrv_Query($conn, $tsql);
	if($getResults == False){
		if(($errors = sqlsrv_errors())!=null){
			formatErrors($errors);
		}
		die("Error in eecuting getSentimentScore() query");
	}
	//echo "getResponseFromID() query successfully executed";
	while($row = sqlsrv_fetch_array($getResults, SQLSRV_FETCH_ASSOC)){
		$result = $row['SentimentScore'];
	}
	return $result;
}

function getBotTime($conn, $interactionID){
	$result = null;
	$tsql = "SELECT BotMsgTime FROM Timestamps WHERE InteractionID = $interactionID;";
	$getResults = sqlsrv_query($conn, $tsql);
	if($getResults == FALSE){
		if(($errors = sqlsrv_errors())!=null){
			formatErrors($errors);
		}
		die("Failure in executing getBotTime() query");
	}

	//echo "getBotTimeFromQID() query successfully executed";
	while($row = sqlsrv_fetch_array($getResults, SQLSRV_FETCH_ASSOC)){
		$result = $row['BotMsgTime'];
	}
	return $result;
}


function getUserTime($conn, $interactionID){
	$result = null;
	$tsql = "SELECT UserMsgTime FROM Timestamps WHERE InteractionID = $interactionID;";
	$getResults = sqlsrv_query($conn, $tsql);
	if($getResults == FALSE){
		if(($errors = sqlsrv_errors())!=null){
			formatErrors($errors);
		}
		die("Failure in executing getUserTime() query");
	}

	//echo "getBotTimeFromQID() query successfully executed";
	while($row = sqlsrv_fetch_array($getResults, SQLSRV_FETCH_ASSOC)){
		$result = $row['UserMsgTime'];
	}
	return $result;
}

function getTimeLapse($conn, $interactionID){
	$result = null;
	$tsql = "SELECT TimeLapse FROM Timestamps WHERE InteractionID = $interactionID;";
	$getResults = sqlsrv_query($conn, $tsql);
	if($getResults == FALSE){
		if(($errors = sqlsrv_errors())!=null){
			formatErrors($errors);
		}
		die("Failure in executing getTimeLapse() query");
	}

	//echo "getBotTimeFromQID() query successfully executed";
	while($row = sqlsrv_fetch_array($getResults, SQLSRV_FETCH_ASSOC)){
		$result = $row['TimeLapse'];
	}
	return $result;
}



function getUserScoresInDateRange($conn, $userID, $dateFrom, $dateTo, $questionnaireType){
	$resultArr = [];
	$tsql = "SELECT ts.TotalScore 
				FROM TotalScores ts JOIN Questionnaires q
				ON ts.QuestionnaireID = q.QuestionnaireID
				WHERE q.UserID = $userID 
				AND q.QuestionnaireType = '$questionnaireType'
				AND DateCompleted >= '$dateFrom' 
				AND DateCompleted <= '$dateTo';";
	$getResults = sqlsrv_Query($conn, $tsql);
	if($getResults == FALSE){
		if(($errors = sqlsrv_errors())!=null){
			formatErrors($errors);
		}
		die("Error in executing getUserScoresInDateRange() query");
	}
	while($row = sqlsrv_fetch_array($getResults, SQLSRV_FETCH_ASSOC)){
		array_push($resultArr, $row['TotalScore']);
	}
	return $resultArr;
}

function getHarmRiskUsers($conn, $questionID){
	$resultArr = [];
	$tsql = "SELECT DISTINCT ui.UserID 
				FROM UserInteractions ui JOIN InteractionQuestionIDs iq
				ON ui.InteractionID = iq.InteractionID
				WHERE iq.QuestionID = $questionID;";
	$getResults = sqlsrv_query($conn, $tsql);
	if($getResults == FALSE){
		if(($errors = sqlsrv_errors())!=null){
			formatErrors($errors);
		}
		die("Failure in executing getHarmRiskUsers() query");
	}

	while($row = sqlsrv_fetch_array($getResults, SQLSRV_FETCH_ASSOC)){
		array_push($resultArr, $row['UserID']);
	}
	return $resultArr;
}

function getUserIDFromInteractionID($conn, $interactionID){
	$result = null;
	$tsql = "SELECT UserID FROM UserInteractions WHERE InteractionID = $interactionID";
	$getResults = sqlsrv_Query($conn, $tsql);
	if($getResults == FALSE){
		if(($errors = sqlsrv_errors())!=null){
			formatErrors($errors);
		}
		die("Failure in executing getUserIDFromInteractionID() query");
	}

	while($row = sqlsrv_fetch_array($getResults, SQLSRV_FETCH_ASSOC)){
		$result = $row['UserID'];
	}
	return $result;
}

function checkForHarmIdeation($text, $suicideIdeationPhrases){
	$phraseFound = false;
	
	for($i = 0; $i<count($suicideIdeationPhrases); $i++){
		if(strpos($text, $suicideIdeationPhrases[$i]) !== false){
			//echo "Yes";
			$phraseFound = true;
			break;
		}else{
			//echo "No";
			$phraseFound = false;
		}
	}
	return $phraseFound;
}


?>