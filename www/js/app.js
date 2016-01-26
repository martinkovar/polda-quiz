'use strict';
angular.module('polda-quiz', ['ionic', 'polda-quiz.controllers', 'polda-quiz.services'])

.run(function($ionicPlatform, ContentService, ProfileService) {
		$ionicPlatform.ready(function() {
			if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
				cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
				cordova.plugins.Keyboard.disableScroll(true);
			}
			if (window.StatusBar) {
				StatusBar.styleLightContent();
				$ionicPlatform.showStatusBar(false);
			}

			//inicializace DB a pokus o synchronizaci
			//TODO zapracovat loading mechanismus (UX prvek)
			//ContentService.initDB();
			//ProfileService.initDB();
		});
	})
	.config(function($stateProvider, $urlRouterProvider, $ionicConfigProvider) {

		$ionicConfigProvider.views.transition('none');
		$ionicConfigProvider.backButton.previousTitleText(false);
		$ionicConfigProvider.backButton.icon('ion-android-arrow-dropleft-circle');

		$stateProvider
			.state('home', {
				url: '/',
				templateUrl: 'templates/home.html',
				controller: 'GameplayCtrl'
			})
		//rychlokvíz
		.state('quiz-game', {
				url: '/quiz-game',
				templateUrl: 'templates/quiz.html',
				abstract: true
			})
			.state('quiz-game.pregame', {
				url: '/pregame',
				views: {
					'gamecanvas': {
						templateUrl: 'templates/quiz-pregame.html',
						controller: 'GameplayCtrl'
					}
				}
			})
			.state('quiz-game.game', {
				url: '/game',
				views: {
					'gamecanvas': {
						templateUrl: 'templates/quiz-game.html',
						controller: 'GameplayCtrl'
					}
				}
			})
			.state('quiz-game.results', {
				url: '/results',
				views: {
					'gamecanvas': {
						templateUrl: 'templates/quiz-results.html',
						controller: 'GameplayCtrl'
					}
				}
			})
			.state('profile', {
				url: '/profile',
				templateUrl: 'templates/profile.html',
				controller: 'ProfileCtrl'
			})
			.state('about', {
				url: '/about',
				templateUrl: 'templates/about.html',
				controller: 'AboutCtrl'
			})

		$urlRouterProvider.otherwise('/');

	});
