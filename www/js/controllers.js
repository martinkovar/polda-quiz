'use strict';
angular.module('polda-quiz.controllers', ['timer'])

.controller('HomeCtrl', function() {
	//TODO
})

.controller('AboutCtrl', function() {
	//TODO
})

.controller('GameplayCtrl', ['$scope', '$location', '$ionicNavBarDelegate', '$log', '$ionicPlatform', 'ContentService', 'GameplayService', 'ProfileService', '$ionicModal', '$ionicHistory', '$ionicPopup', '$state', function($scope, $location, $ionicNavBarDelegate, $log, $ionicPlatform, ContentService, GameplayService, ProfileService, $ionicModal, $ionicHistory, $ionicPopup, $state) {
	$scope.$log = $log;
	$scope.game = GameplayService.all();
	$scope.selectedOption = 0;

	$ionicPlatform.ready(function() {
		ContentService.getQuestions().then(function(questions) {
			$scope.questions = questions;
		});
	});

	$scope.startGame = function() {
		$scope.selectedOption = 0;
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
			$state.go('quick-quiz.game');
		}
	};
	$scope.nextQuestion = function() {
		if ($scope.game.gameStatistics.answeredQuestions < 10) {
			$scope.selectedOption = 0;
			GameplayService.setActiveQuestion();
			$scope.$broadcast('timer-set-countdown', 10);
			$scope.$broadcast('timer-start');
		} else {
			$state.go('quick-quiz.results');
		}
	};

	$scope.getHelp = function() {
		//TODO
	}

	$scope.exitGame = function() {
		var confirmPopup = $ionicPopup.confirm({
			title: 'Opravdu ukončit hru?',
			template: 'Fakt to chceš zabalit?'
		});
		confirmPopup.then(function(res) {
			if (res) {
				$state.go('home');
			} else {
				//zruseno
			}
		});
	};

	$scope.answer = function(index, isAnswer) {
		$scope.$broadcast('timer-clear');
		$scope.timerRunning = false;
		$scope.selectedOption = index + 1;
		GameplayService.setactiveQuestionAnswered(true);
		GameplayService.setScoreQuestion(isAnswer);
		if (isAnswer) {
			$log.log('cool - správně');
			return true;
		} else {
			$log.log('not so cool - špatně');
			return false;
		}
	};

	$scope.timeLimit = function() {
		$log.log('Vypršel čas');
		GameplayService.setactiveQuestionAnswered(true);
		GameplayService.setScoreQuestion(false);
		$scope.$apply();
	};

}]);
