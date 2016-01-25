'use strict';
angular.module('polda-quiz.controllers', ['timer'])

.controller('HomeCtrl', function() {
	//TODO
})

.controller('AboutCtrl', function() {
	//TODO
})

.controller('ProfileCtrl', ['$scope', '$location', '$ionicNavBarDelegate', '$log', '$ionicPlatform', 'ContentService', 'GameplayService', 'ProfileService', '$ionicModal', '$ionicHistory', '$ionicPopup', '$state', function() {
	$scope.profile = ProfileService.all();
}])

.controller('GameplayCtrl', ['$scope', '$location', '$ionicNavBarDelegate', '$log', '$ionicPlatform', 'ContentService', 'GameplayService', 'ProfileService', '$ionicModal', '$ionicHistory', '$ionicPopup', '$state', function($scope, $location, $ionicNavBarDelegate, $log, $ionicPlatform, ContentService, GameplayService, ProfileService, $ionicModal, $ionicHistory, $ionicPopup, $state) {
	$scope.$log = $log;
	$scope.game = GameplayService.all();
	$scope.profile = ProfileService.all();
	$scope.selectedOption = 0;

	$ionicPlatform.ready(function() {
		ContentService.getQuestions().then(function(questions) {
			$scope.questions = questions;
		});
	});

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
	$scope.nextQuestion = function() {

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
		GameplayService.setActiveQuestionAnswered(true);
		GameplayService.setScoreQuestion(isAnswer);

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
			if ($scope.game.gameStatistics.answeredQuestions < 10) {
				$scope.selectedOption = 0;
				GameplayService.setActiveQuestion();
				$scope.$broadcast('timer-set-countdown', 10);
				$scope.$broadcast('timer-start');
			} else {
				$state.go('quiz-game.pregame');
			}
		});
	};

	$scope.timeLimit = function() {
		GameplayService.setActiveQuestionAnswered(true);
		GameplayService.setScoreQuestion(false);
		$scope.$apply();
		var alertPopup = $ionicPopup.alert({
     title: 'Nezodpovězeno!',
     template: 'Ani obraz, ani zvuk...'
   });

	 alertPopup.then(function(res) {
			if ($scope.game.gameStatistics.answeredQuestions < 10) {
				$scope.selectedOption = 0;
				GameplayService.setActiveQuestion();
				$scope.$broadcast('timer-set-countdown', 10);
				$scope.$broadcast('timer-start');
			} else {
				$state.go('quiz-game.pregame');
			}
		});
	};

}]);
