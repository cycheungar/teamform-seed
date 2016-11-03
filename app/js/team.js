$(document).ready(function(){

	$('#team_page_controller').hide();
	$('#text_event_name').text("Error: Invalid event name ");
	var eventName = getURLParameter("q");
	if(eventName != null && eventName !== '') {
		$('#text_event_name').text("Event name: " + eventName);
	}

});

angular.module('teamform-team-app', ['firebase'])
.controller('TeamCtrl', ['$scope', '$firebaseObject', '$firebaseArray', 
    function($scope, $firebaseObject, $firebaseArray) {

	var refPath = "";
	var eventName = getURLParameter("q");
	
	// TODO: implementation of MemberCtrl	
	$scope.param = {
		"teamName" : '',
		"currentTeamSize" : 0,
		"teamMembers" : []
	};
	$scope.uid = "";
	$scope.currentUser = [];

	firebase.auth().onAuthStateChanged(function(firebaseUser) {
		if(firebaseUser) {
			var user = firebase.auth().currentUser;
			$scope.uid = user.uid;
			refPath = eventName + "/member/" + $scope.uid;
			$scope.currentUser = $firebaseObject(firebase.database().ref(refPath));			
			$scope.loadFunc();
		}
	});

	refPath = eventName + "/admin";
	retrieveOnceFirebase(firebase, refPath, function(data) {
		if(data.child("param").val() != null) {
			$scope.range = data.child("param").val();
			$scope.param.currentTeamSize = parseInt(($scope.range.minTeamSize + $scope.range.maxTeamSize)/2);
			$scope.$apply(); // force to refresh
			$('#team_page_controller').show(); // show UI
		} 
	});
	
	refPath = eventName + "/member";
	$scope.member = [];
	$scope.member = $firebaseArray(firebase.database().ref(refPath));
	
	refPath = eventName + "/team";
	$scope.team = [];
	$scope.team = $firebaseArray(firebase.database().ref(refPath));	
	
	$scope.requests = [];

	$scope.retrieveNameFromID = function(id) {
		var name = "";
		$.each($scope.member, function(i, obj) {
			if(id === obj.$id) {
				name = obj.name;
			}
		});
		return name;
	};

	$scope.retrieveNamesFromJSON = function(jsonObj) {
		var result = [];
		angular.forEach(jsonObj, function(member) {
			$.each($scope.member, function(i, obj) {
				if(member == obj.$id) {
					result.push(obj.name);
				}
			});
		});
		return result;
	};

	$scope.refreshViewRequestsReceived = function() {
		$scope.requests = [];
		var teamID = $.trim( $scope.param.teamName );
				
		$.each($scope.member, function(i,obj) {
			var userID = obj.userid;
			if(typeof obj.selection != "undefined"  && obj.selection.indexOf(teamID) > -1) {
				$scope.requests.push(userID);
			}
		});
		$scope.$apply();
	};
	
	$scope.changeCurrentTeamSize = function(delta) {
		var newVal = $scope.param.currentTeamSize + delta;
		if(newVal >= $scope.range.minTeamSize && newVal <= $scope.range.maxTeamSize) {
			$scope.param.currentTeamSize = newVal;
		}
	};

	$scope.saveFunc = function() {
		var teamID = $.trim( $scope.param.teamName );
		var status = $("#add").text();
		if(teamID !== '' && status === "Save") {
			var newData = {
				'size': $scope.param.currentTeamSize,
				'teamMembers': $scope.param.teamMembers
			};
			var refPath = getURLParameter("q") + "/team/" + teamID;
			var ref = firebase.database().ref(refPath);
			
			$.each($scope.param.teamMembers, function(i,obj) {
				var rec = $scope.member.$getRecord(obj);
				rec.selection = [];		// clear all requests of member
				rec.inTeam = teamID;
				$scope.member.$save(rec);
			});
			
			ref.set(newData, function() {
				location.reload();
			});
		} else if(teamID !== '' && status === "Add") {
			$scope.param.teamMembers.push($scope.uid);
			var newData = {
				'size': $scope.param.currentTeamSize,
				'teamMembers': $scope.param.teamMembers
			};
			$.each($scope.param.teamMembers, function(i, obj) {
				var rec = $scope.member.$getRecord(obj);
				rec.selection = [];
				rec.inTeam = teamID;
				$scope.member.$save(rec);
			});
			var refPath = getURLParameter("q") + "/team/" + teamID;
			var ref = firebase.database().ref(refPath);
			ref.set(newData);
		}
	};
	
	$scope.loadFunc = function() {
		var teamID = "";
		$scope.currentUser.$bindTo($scope, "data").then(function() {
			if($scope.data.inTeam != null) {
				$("#add").html("Save");
				teamID = $scope.data.inTeam;
				$scope.param.teamName = $scope.data.inTeam;
				var eventName = getURLParameter("q");
				var refPath = eventName + "/team/" + teamID ;
				retrieveOnceFirebase(firebase, refPath, function(data) {
					if(data.child("size").val() != null) {
						$scope.param.currentTeamSize = data.child("size").val();
						$scope.refreshViewRequestsReceived();
					}
					if(data.child("teamMembers").val() != null) {
						$scope.param.teamMembers = data.child("teamMembers").val();
					}
					$scope.$apply(); // force to refresh
				});
			}
			else {
				$("#add").html("Add");
			}
		});		
	};
	
	$scope.processRequest = function(r) {
		//$scope.test = "processRequest: " + r;		
		if($scope.param.teamMembers.indexOf(r) < 0 && 
			$scope.param.teamMembers.length < $scope.param.currentTeamSize) {
			// Not exists, and the current number of team member is less than the preferred team size
			$scope.param.teamMembers.push(r);
			$scope.saveFunc();
		}
	};
	
	$scope.removeMember = function(member) {
		var index = $scope.param.teamMembers.indexOf(member);
		if(index > -1) {
			$scope.param.teamMembers.splice(index, 1); // remove that item
			$scope.saveFunc();
		}
		var refPath = eventName + "/member/" + member;
		var ref = firebase.database().ref(refPath);
		ref.update({inTeam: null});
	};

}]);