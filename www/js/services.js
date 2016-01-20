'use strict';
angular.module('polda-quiz.services', [])
	.factory('GameplayService', ['$q', 'ContentService', 'ProfileService', function($q, ContentService, ProfileService) {

		var _game = {
			gameSetup: {
				selectedDifficulty: 0,
				selectedTopic: 0,
				generatedQuestions: []
			},
			activeQuestion: {},
			activeProfile: 0,
			isActiveQuestionsAnswered: false,
			gameStatistics: {
				successQuestions: 0,
				failedQuestions: 0,
				answeredQuestions: 0
			}
		};

		return {
			all: function() {
				return _game;
			},
			getTopic: function() {
				return _game.gameSetup.selectedTopic;
			},
			getDifficulty: function() {
				return _game.gameSetup.selectedDifficulty;
			},
			getHistory: function() {
				return _game.gameSetup.generatedQuestions;
			},
			setDifficulty: function(difficulty) {
				_game.gameSetup.selectedDifficulty = difficulty;
			},
			setTopic: function(topic) {
				_game.gameSetup.selectedTopic = topic;
			},
			setQuizQuestion: function() {
				console.log('start setquizquestion');
				_game.activeQuestion = {};
				_game.isActiveQuestionsAnswered = false;
				_game.activeQuestion = ContentService.getRandomQuestion(_game.gameSetup);
				if (_game.activeQuestion === undefined || _game.activeQuestion === null) {
					return null;
				} else {
					return _game.activeQuestion;
				}
			},
			setactiveQuestionAnswered: function(state) {
				_game.isActiveQuestionsAnswered = state;
			},
			setScoreQuestion: function(result) {
				_game.gameStatistics.answeredQuestions++;
				if (result) {
					_game.gameStatistics.successQuestions++;
				} else {
					_game.gameStatistics.failedQuestions++;
				}
			},
			setGameScore: function() {
				ProfileService.updateStatistics(_game.gameStatistics.successQuestions, _game.gameStatistics.failedQuestions);
			},
			restoreGame: function() {
				_game.gameSetup = {};
				_game.gameSetup.selectedTopic = 0;
				_game.gameSetup.selectedDifficulty = 0;
				_game.gameStatistics.failedQuestions = 0;
				_game.gameStatistics.successQuestions = 0;
				_game.gameStatistics.answeredQuestions = 0;
				_game.activeQuestion = '';
			}
		};
	}])

.factory('ContentService', ['$q', '$ionicPopup', '$log', function($q, $ionicPopup, $log) {

	var _localDB;
	var _questions; //lokalni cache pro otazky

	var defaultQuestions = [{
		id: 0,
		question: 'Který živočich Dagmar Havlová při 19°C žloutne?',
		options: [{
			text: 'Tučňák',
			isAnswer: true
		}, {
			text: 'Samice hrabáče'
		}, {
			text: 'Zaoceánský parník'
		}, {
			text: 'Mononukleóza'
		}],
		difficulty: 0,
		topic: 0
	}, {
		id: 1,
		question: 'Proč je voda mokrá?',
		options: [{
			text: 'Tučňák'
		}, {
			text: 'Samice hrabáče',
			isAnswer: true
		}, {
			text: 'Zaoceánský parník'
		}, {
			text: 'Mononukleóza'
		}],
		difficulty: 0,
		topic: 0
	}, {
		id: 2,
		question: 'Kdo je Albert Einstein?',
		options: [{
			text: 'Tučňák'
		}, {
			text: 'Samice hrabáče'
		}, {
			text: 'Zaoceánský parník'
		}, {
			text: 'Mononukleóza',
			isAnswer: true
		}],
		difficulty: 0,
		topic: 0
	}];

	var _topics = [{
		id: 0,
		title: 'Estonská vína',
		desc: ''
	}, {
		id: 1,
		title: 'Telegrafní sloupy 19. století',
		desc: ''
	}, {
		id: 2,
		title: 'Lidové tance',
		desc: ''
	}];

	var _difficulties = [{
		id: 0,
		title: 'Lehká',
		desc: ''
	}, {
		id: 1,
		title: 'Tak akorát',
		desc: ''
	}, {
		id: 2,
		title: 'Krutopřísná',
		desc: ''
	}];

	function onDatabaseChange(change) {
		var index = findIndex(_questions, change.id);
		var question = _questions[index];

		if (change.deleted) {
			if (question) {
				_questions.splice(index, 1); // delete
			}
		} else {
			if (question && question._id === change.id) {
				_questions[index] = change.doc; // update
			} else {
				_questions.splice(index, 0, change.doc); // insert
			}
		}
	}

	// Binarni hledani, pole je defaultne razeno podle _id.
	function findIndex(array, id) {
		var low = 0,
			high = array.length,
			mid;
		while (low < high) {
			mid = (low + high) >>> 1;
			array[mid]._id < id ? low = mid + 1 : high = mid;
		}
		return low;
	}

	function shuffle(array) {
		var currentIndex = array.length,
			temporaryValue, randomIndex;
		while (0 !== currentIndex) {

			// Pick a remaining element...
			randomIndex = Math.floor(Math.random() * currentIndex);
			currentIndex -= 1;

			temporaryValue = array[currentIndex];
			array[currentIndex] = array[randomIndex];
			array[randomIndex] = temporaryValue;
		}

		return array;
	}

	return {
		initDB: function() {
			_localDB = new PouchDB('quiz_database12', {
				adapter: 'websql'
			});

			$q.when(_localDB.allDocs({
				include_docs: true
			}))
			.then(function(docs) {
				console.log("naplneni cache otazkami z lokalni db");
				_questions = docs.rows.map(function(row) {
					return row.doc;
				});
			}).then(function(){
				//naplneni lokalni db default hodnotami v priprade prazdne lokalni db
				if (_questions.length === 0) {
					console.log("defaultni naplneni otazkami v pripade prazdne lokalni db");
					// TOTO SE MUSÍ SYNCHRONIZOVAT!!!!!
					$q.when(_localDB.bulkDocs(defaultQuestions));
					_questions = defaultQuestions;
				}
				console.log("doslo k finalni inicializaci");
				console.log(_questions);

				var _remoteDB = new PouchDB("http://localhost:5984/quiz_database");

				_localDB.sync(_remoteDB, {
					// v produkci live a retry vypnout? asi jo
					//live: true,
					//retry: true
				})
				.on('change', function(info) {
					// handle change
				}).on('paused', function() {
					// replication paused (e.g. user went offline)
				}).on('active', function() {
					// replicate resumed (e.g. user went back online)
				}).on('denied', function(info) {
					// a document failed to replicate, e.g. due to permissions
				}).on('complete', function(info) {
					// handle complete
					console.log('db synchronizace');
				}).on('error', function(err) {
					// handle error
					var alertPopup = $ionicPopup.alert({
						title: 'Chyba synchronizace!',
						template: 'Nelze přistoupit k serverovým datům'
					});
					alertPopup.then(function(res) {
						$log.log('chyba při synchronizaci');
					});
				});
			});
		},
		getQuestion: function(questionId) {
			for (var i = 0; i < _questions.length; i++) {
				if (_questions[i].id === parseInt(questionId)) {
					return _questions[i];
				}
			}
			return null;
		},
		getAllQuestions: function() {
			if (!_questions) {
				return $q.when(_localDB.allDocs({
						include_docs: true
					}))
					.then(function(docs) {
						_questions = docs.rows.map(function(row) {
							return row.doc;
						});

						// Listen for changes on the database.
						_localDB.changes({
								live: true,
								since: 'now',
								include_docs: true
							})
							.on('change', onDatabaseChange);

						return _questions;
					});

			} else {
				// Vrátit nacachovaná (lokálně uložená) data
				return $q.when(_questions);
			}
		},
		getQuestions: function(level) {
			if (!_questions) {
				return $q.when(_localDB.allDocs({
						include_docs: true
					}))
					.then(function(docs) {
						_questions = docs.rows.map(function(row) {
							return row.doc;
						});

						// Listen for changes on the database.
						_localDB.changes({
								live: true,
								since: 'now',
								include_docs: true
							})
							.on('change', onDatabaseChange);

						return _questions;
					});

			} else {
				// Vrátit nacachovaná (lokálně uložená) data
				return $q.when(_questions);
			}
		},
		getRandomQuestion: function(gameSetup) {
			console.log('start random question');
			console.log(_questions);// toto je null
			if (_questions) {
				var questionList = [];
				for (var i = 0; i < _questions.length; i++) {
					if (_questions[i].topic === gameSetup.selectedTopic && _questions[i].difficulty === gameSetup.selectedDifficulty) {
						questionList.push(_questions[i]);
					}
				}
				if (questionList.length > 0) {
					var randomId = parseInt(Math.floor(Math.random() * questionList.length));
					console.log('nahodne id: ' + randomId + ' a delka pole: ' + questionList.length);
					var randomQuestion = questionList[randomId];
					shuffle(randomQuestion.options);
					return randomQuestion;
				}
			} else {
				return null;
			}
		},
		//zrusit
		getTopics: function() {
			return _topics;
		},
		getDifficulties: function() {
			return _difficulties;
		}
		//konec zrusit
	};
}])

.factory('ProfileService', ['$q', function($q) {
	//TODO
	var _profiles = [{
		id: 0,
		name: 'Martin',
		level: 1,
		pesona: 0,
		rewards: [0, 2, 4]
	}];

	var _statistics = [{
		total: {
			successQuestions: 0,
			failedQuestions: 0,
			answeredQuestions: 0
		},
	}];

	return {
		all: function() {
			return _profiles;
		},
		getStatistics: function() {
			return _statistics;
		},
		updateStatistics: function(success, failure) {
			_statistics.total.successQuestions += success;
			_statistics.total.failedQuestions += failure;
			_statistics.answeredQuestions += success + failure;
		}
	};

}]);
