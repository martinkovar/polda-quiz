'use strict';
angular.module('polda-quiz.controllers', ['timer'])

.controller('AboutCtrl', function() {
	//TODO
})

.controller('ProfileCtrl', ['$scope', '$location', '$ionicNavBarDelegate', '$log', '$ionicPlatform', 'ContentService', 'GameplayService', 'ProfileService', '$ionicModal', '$ionicHistory', '$ionicPopup', '$state', function() {
	$ionicPlatform.ready(function() {
		/*ContentService.getQuestions().then(function(questions) {
			$scope.questions = questions;
		});
		ProfileService.getProfile().then(function(profile) {
			$scope.profile = profile;
		});*/
	});

}])

.controller('GameplayCtrl', ['$scope', '$location', '$ionicNavBarDelegate', '$log', '$ionicPlatform', 'ContentService', 'GameplayService', 'ProfileService', '$ionicModal', '$ionicHistory', '$ionicPopup', '$state', '$ionicLoading', function($scope, $location, $ionicNavBarDelegate, $log, $ionicPlatform, ContentService, GameplayService, ProfileService, $ionicModal, $ionicHistory, $ionicPopup, $state, $ionicLoading) {

	$ionicPlatform.ready(function() {
		ContentService.initDB();
		$scope.$log = $log;
		$scope.game = GameplayService.all();
		$scope.selectedOption = 0;
		$scope.clueUsed = false;
		ProfileService.initDB().then(function(response) {
			$scope.profile = response;
			//console.log($scope.profile);
		});
		$scope.ranks = [
{'level': 0,'name': 'Rekrut', 'successRate': 60, 'failRate': 40},
{'level': 1,'name': 'Rotný', 'successRate': 60, 'failRate': 40},
{'level': 2,'name': 'Strážmistr', 'successRate': 60, 'failRate': 40},
{'level': 3,'name': 'Nadstrážmistr', 'successRate': 60, 'failRate': 40},
{'level': 4,'name': 'Podpraporčík', 'successRate': 60, 'failRate': 40},
{'level': 5,'name': 'Praporčík', 'successRate': 60, 'failRate': 40},
{'level': 6,'name': 'Nadpraporčík', 'successRate': 60, 'failRate': 40},
{'level': 7,'name': 'Podporučík', 'successRate': 60, 'failRate': 40},
{'level': 8,'name': 'Poručík', 'successRate': 60, 'failRate': 40},
{'level': 9,'name': 'Nadporučík', 'successRate': 60, 'failRate': 40},
{'level': 10,'name': 'Kapitán', 'successRate': 60, 'failRate': 40},
{'level': 11,'name': 'Major', 'successRate': 60, 'failRate': 40},
{'level': 12,'name': 'Podplukovník', 'successRate': 60, 'failRate': 40},
{'level': 13,'name': 'Plukovník', 'successRate': 60, 'failRate': 40},
{'level': 14,'name': 'Brigádní generál', 'successRate': 60, 'failRate': 40},
{'level': 15,'name': 'Generálmajor', 'successRate': 60, 'failRate': 40},
{'level': 16,'name': 'Generálporučík', 'successRate': 60, 'failRate': 40}
];
	});



	function roundEvaluation() {
		//zapis zmenene statistiky
		GameplayService.setGameScore();
		//udelej zmenu v levelu
		//console.log(100 * $scope.game.gameStatistics.successQuestions / $scope.game.gameStatistics.answeredQuestions);
		if((100 * $scope.game.gameStatistics.successQuestions / $scope.game.gameStatistics.answeredQuestions) > $scope.ranks[$scope.profile.level].successRate) {
			ProfileService.setLevel($scope.profile.level + 1);
		} else if ((100 * $scope.game.gameStatistics.successQuestions / $scope.game.gameStatistics.answeredQuestions) < $scope.ranks[$scope.profile.level].failRate) {
			ProfileService.setLevel($scope.profile.level - 1);
		} else {
			//nemenit profil
		}
		$state.go('quiz-game.pregame');
	}
	$scope.showLoading = function() {
	    $ionicLoading.show({
	      template: 'Loading...'
	    });
	  };
	  $scope.hideLoading = function(){
	    $ionicLoading.hide();
	  };
	$scope.newCareer = function() {
		var confirmPopup = $ionicPopup.confirm({
			title: 'Nová hra',
			template: 'Opravdu chcete začít novou hru? Přijdete o veškeré hodnosti..'
		});

		confirmPopup.then(function(res) {
			if (res) {
				//vymazani profilu
				$scope.profile = ProfileService.resetProfile();
				console.log($scope.profile);
				//zapnuti nove hry
				$state.go('quiz-game.pregame');
			}
		});
	};
	$scope.startGame = function() {
		$scope.selectedOption = 0;
		GameplayService.restoreGame();
		GameplayService.setGameQuestions();
		var response = GameplayService.setActiveQuestion();
		if (response === null) {
			var alertPopup = $ionicPopup.alert({
				title: 'Nejsou otázky!',
				subTitle: 'Průser nebo lenost?',
				template: 'Sorry, v db <strong>není</strong> odpovídající otázka'
			});
			alertPopup.then(function(res) {
				$log.log('nula - sorry nejsou otázky');
			});
		} else {
			$state.go('quiz-game.game');
		}
	};
	$scope.getClue = function() {
		if(!$scope.clueUsed){
			$scope.clueUsed = true;
			$scope.timerRunning = false;
			var alertPopup = $ionicPopup.alert({
				title: 'Nápověda 50/50!',
				template: 'Chcete použít nápovědu?'
			});
			alertPopup.then(function(res) {
				if(res) {
					//GameplayService.setActiveQuestion();
					//vymaz 2 nespravne odpovědi ze scope aktualnich options
					var limit = 0;
					while (limit < 1) {
						for (var i = 0; i < $scope.game.activeQuestion.options.length; i++) {
							if (!$scope.game.activeQuestion.options[i].isAnswer) {
								$scope.game.activeQuestion.options.splice(i,1);
								limit++;
							}
						}
					}

				} else {
					$scope.timerRunning = true;
				}
			});
		}
	};

	$scope.exitGame = function() {
		var confirmPopup = $ionicPopup.confirm({
			title: 'Opravdu ukončit hru?',
			template: 'Fakt to chceš zabalit?'
		});
		confirmPopup.then(function(res) {
			if (res) {
				$scope.$broadcast('timer-clear');
				$scope.timerRunning = false;
				roundEvaluation();
			} else {
				//zruseno
			}
		});
	};

	$scope.answer = function(index, isAnswer) {
		$scope.$broadcast('timer-clear');
		$scope.timerRunning = false;
		$scope.selectedOption = index + 1;
		GameplayService.setActiveQuestionAnswered(true);


		if (isAnswer) {
			var alertPopup = $ionicPopup.alert({
				title: 'Správně!',
				template: 'Dobře ty!'
			});
		} else {
			var alertPopup = $ionicPopup.alert({
				title: 'Špatně!',
				template: 'Sorry, detektive...'
			});
		}
		alertPopup.then(function(res) {
			GameplayService.setScoreQuestion(isAnswer);
			if ($scope.game.gameStatistics.answeredQuestions < 10) {
				$scope.selectedOption = 0;
				GameplayService.setActiveQuestion();
				$scope.$broadcast('timer-set-countdown', 10);
				$scope.$broadcast('timer-start');
			} else {
				roundEvaluation();
			}
		});
	};

	$scope.timeLimit = function() {
		var alertPopup = $ionicPopup.alert({
			title: 'Nezodpovězeno!',
			template: 'Sorry, musíš se vymáčknout...'
		});
		alertPopup.then(function(res) {
			GameplayService.setScoreQuestion(false);
			GameplayService.setActiveQuestionAnswered(true);
			if ($scope.game.gameStatistics.answeredQuestions < 10) {
				$scope.selectedOption = 0;
				GameplayService.setActiveQuestion();
				$scope.$broadcast('timer-set-countdown', 10);
				$scope.$broadcast('timer-start');
			} else {
				roundEvaluation();
			}
		});
		$scope.$apply();
	};

}]);
