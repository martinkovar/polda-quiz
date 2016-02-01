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

.controller('GameplayCtrl', ['$scope', '$location', '$ionicNavBarDelegate', '$http', '$log', '$ionicPlatform', 'ContentService', 'GameplayService', 'ProfileService', '$ionicModal', '$ionicHistory', '$ionicPopup', '$state', '$ionicLoading', function($scope, $location, $ionicNavBarDelegate, $http, $log, $ionicPlatform, ContentService, GameplayService, ProfileService, $ionicModal, $ionicHistory, $ionicPopup, $state, $ionicLoading) {

	$ionicPlatform.ready(function() {
		ContentService.initDB();
		$scope.$log = $log;
		$scope.game = GameplayService.all();
		$scope.clueUsed = false;
		ProfileService.initDB().then(function(response) {
			$scope.$watch(function() {
				return ProfileService.getProfile()
			}, function(newVal, oldVal) {
				if (typeof newVal !== 'undefined') {
					$scope.profile = ProfileService.getProfile();
				}
			});
		});
		$http.get("./content/ranks.json").success(function(data) {
			$scope.ranks = data;
		});
	});

	function roundEvaluation() {
		//zapis zmenene statistiky
		GameplayService.setGameScore();
		//udelej zmenu v levelu
		//console.log(100 * $scope.game.gameStatistics.successQuestions / $scope.game.gameStatistics.answeredQuestions);
		if ((100 * $scope.game.gameStatistics.successQuestions / $scope.game.gameStatistics.answeredQuestions) > $scope.ranks[$scope.profile.level].successRate) {
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
	$scope.hideLoading = function() {
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
		GameplayService.restoreGame();
		//spatny propis dat do scope!
		$scope.game.questions = GameplayService.setGameQuestions();

		if ($scope.game.questions === null) {
			var alertPopup = $ionicPopup.alert({
				title: 'Nejsou otázky!',
				subTitle: 'Průser nebo lenost?',
				template: 'Sorry, v db <strong>není</strong> odpovídající otázka'
			});
			alertPopup.then(function(res) {
				$log.log('nula - sorry nejsou otázky');
			});
		} else {
			GameplayService.setActiveQuestion($scope.game.activeQuestion);
			GameplayService.setActiveQuestionAnswered(false);
			$state.go('quiz-game.game');
		}
	};
	$scope.getClue = function(type) {
		if (parseInt(type) === 1) {
			if (!$scope.game.clueUsed) {
				$scope.timerRunning = false;
				var alertPopup = $ionicPopup.alert({
					title: 'Nápověda 50/50!',
					template: 'Chcete použít nápovědu?'
				});
				alertPopup.then(function(res) {
					if (res) {
						GameplayService.getClue();
						$scope.$broadcast('timer-clear');
					} else {
						$scope.timerRunning = true;
					}
				});
			}
		} else if (parseInt(type) === 2) {
			//TODO
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
		GameplayService.setSelectedOption(index + 1);
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
			if ($scope.game.activeQuestion < $scope.game.questionNumber - 1) {
				GameplayService.setActiveQuestionAnswered(false);
				GameplayService.setNextActiveQuestion();
				GameplayService.setSelectedOption(0);
				$scope.$broadcast('timer-set-countdown', $scope.game.timeLimit);
				$scope.$broadcast('timer-start');
			} else {
				roundEvaluation();
			}
		});
	};

	$scope.timeLimit = function() {
		$scope.$broadcast('timer-clear');
		$scope.timerRunning = false;
		GameplayService.setActiveQuestionAnswered(true);
		var alertPopup = $ionicPopup.alert({
			title: 'Nezodpovězeno!',
			template: 'Sorry, musíš se vymáčknout...'
		});
		alertPopup.then(function(res) {
			GameplayService.setScoreQuestion(false);
			if ($scope.game.activeQuestion < $scope.game.questionNumber - 1) {
				GameplayService.setActiveQuestionAnswered(false);
				GameplayService.setNextActiveQuestion();
				GameplayService.setSelectedOption(0);
				$scope.$broadcast('timer-set-countdown', $scope.game.timeLimit);
				$scope.$broadcast('timer-start');
			} else {
				roundEvaluation();
			}
		});
		$scope.$apply();
	};

}]);
