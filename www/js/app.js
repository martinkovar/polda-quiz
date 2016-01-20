'use strict';
angular.module('polda-quiz', ['ionic', 'polda-quiz.controllers', 'polda-quiz.services'])

.run(function($ionicPlatform, ContentService) {
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
			ContentService.initDB();

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
				controller: 'HomeCtrl'
			})
		//rychlokvíz
		.state('quick-quiz', {
				url: '/quick-quiz',
				templateUrl: 'templates/quickquiz.html',
				abstract: true
			})
			.state('quick-quiz.pregame', {
				url: '/pregame',
				views: {
					'gamecanvas': {
						templateUrl: 'templates/quickquiz-pregame.html',
						controller: 'GameplayCtrl'
					}
				}
			})
			.state('quick-quiz.game', {
				url: '/game',
				views: {
					'gamecanvas': {
						templateUrl: 'templates/quickquiz-game.html',
						controller: 'GameplayCtrl'
					}
				}
			})
			.state('quick-quiz.results', {
				url: '/results',
				views: {
					'gamecanvas': {
						templateUrl: 'templates/quickquiz-results.html',
						controller: 'GameplayCtrl'
					}
				}
			})
			.state('about', {
				url: '/about',
				templateUrl: 'templates/about.html',
				controller: 'AboutCtrl'
			})

		$urlRouterProvider.otherwise('/');

	});
