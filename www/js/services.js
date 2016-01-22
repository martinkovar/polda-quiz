'use strict';
angular.module('polda-quiz.services', [])
	.factory('GameplayService', ['$q', 'ContentService', 'ProfileService', function($q, ContentService, ProfileService) {

		var _game = {
			gameSetup: {
				level: 0,
				generatedQuestions: []
			},
			questions: {},
			activeQuestion: {},
			activeProfile: 0,
			isActiveQuestionsAnswered: false,
			gameStatistics: {
				successQuestions: 0,
				failedQuestions: 0,
				answeredQuestions: 0
			}
		};

		//pomocna funkce pro nahodne prehazeni prvku v poli
		function shuffle(array) {
			var currentIndex = array.length,
				temporaryValue, randomIndex;
			while (0 !== currentIndex) {
				randomIndex = Math.floor(Math.random() * currentIndex);
				currentIndex -= 1;
				temporaryValue = array[currentIndex];
				array[currentIndex] = array[randomIndex];
				array[randomIndex] = temporaryValue;
			}
			return array;
		}

		return {
			all: function() {
				return _game;
			},
			getlevel: function() {
				return _game.gameSetup.level;
			},
			getHistory: function() {
				return _game.gameSetup.generatedQuestions;
			},
			setlevel: function(level) {
				ProfileService.setLevel(level);
				_game.gameSetup.level = level;
			},
			setGameQuestions: function() {
				//nacteni sady otazek pro dane kolo
				_game.questions = ContentService.getGameQuestions(_game.gameSetup.level);
			},
			setActiveQuestion: function() {
				_game.activeQuestion = {};
				_game.isActiveQuestionsAnswered = false;

					console.log(_game.questions);
					if (_game.questions.length > 0) {
						var randomId = parseInt(Math.floor(Math.random() * _game.questions.length));
						console.log('nahodne id: ' + randomId + ' a delka pole: ' + _game.questions.length);
						var randomQuestion = _game.questions[randomId];
						shuffle(randomQuestion.options);
						_game.activeQuestion = randomQuestion;
					}


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
				_game.gameSetup.selectedlevel = 0;
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
		level: 0,
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
		level: 0,
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
		level: 0,
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

	return {
		initDB: function() {
			//vytvoreni lokalni databaze na klientovi
			_localDB = new PouchDB('quiz_database15', {
				adapter: 'websql'
			});
			//vraceni vsech dokumentu lokalni databaze
			$q.when(_localDB.allDocs({
				include_docs: true
			}))
			.then(function(docs) {
				//naplneni cache (promenne _questions) otazkami z lokalni db
				_questions = docs.rows.map(function(row) {
					return row.doc;
				});
			})
			.then(function(){
				//v priprade prazdne lokalni db
				if (_questions.length === 0) {
					//naplneni lokalni db default hodnotami (ktere jsou napevno v kodu)
					$q.when(_localDB.bulkDocs(defaultQuestions));
					_questions = defaultQuestions;
				}

				var _remoteDB = new PouchDB("http://localhost:5984/quiz_database");
				_localDB.sync(_remoteDB, {
					// v produkci live a retry vypnout? asi jo
					//live: true,
					//retry: true
				})
				.on('change', function(info) {
					// handle change
					$q.when(_localDB.allDocs({
						include_docs: true
					}))
					.then(function(docs) {
						//naplneni cache (promenne _questions) otazkami z lokalni db
						_questions = docs.rows.map(function(row) {
							return row.doc;
						});
					});
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
		getQuestions: function() {
			// Vrátit nacachovaná (lokálně uložená) data
			return $q.when(_questions);
		},
		getGameQuestions: function(level) {
			//vytridit otazky pro dany level
			//nahodne vybrat 10 otazek
			console.log(_questions.length);
			var arr = [];
			for (var i = 0; i < _questions.length; i++) {
				if (_questions[i].level === parseInt(level)) {
					arr.push(_questions[i]);
				}
			}
			console.log(arr.length);
			// toto cislo prijde zmenit na 10 az bude dostatecny pocet otazek!!!!!
			var n = 2;
			var result = new Array(n),
		        len = arr.length,
		        taken = new Array(len);
		    if (n > len)
		        throw new RangeError("getRandom: more elements taken than available");
		    while (n--) {
		        var x = Math.floor(Math.random() * len);
		        result[n] = arr[x in taken ? taken[x] : x];
		        taken[x] = --len;
		    }
			return result;
		}
	};
}])

.factory('ProfileService', ['$q', function($q) {
	var _localDB;
	var _profiles; //lokalni cache pro otazky

//starsi
	var _profile = [{
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
		},
		initDB: function() {
			_localDB = new PouchDB('profile_database1', {
				adapter: 'websql'
			});

			$q.when(_localDB.allDocs({
				include_docs: true
			}))
			/*
			.then(function(docs) {
				//console.log("naplneni cache otazkami z lokalni db");
				_questions = docs.rows.map(function(row) {
					return row.doc;
				});
			})*/
			.then(function(){
				//naplneni lokalni db default hodnotami v priprade prazdne lokalni db
				if (_questions.length === 0) {
					//console.log("defaultni naplneni otazkami v pripade prazdne lokalni db");
					// TOTO SE MUSÍ SYNCHRONIZOVAT!!!!!
					$q.when(_localDB.bulkDocs(defaultQuestions));
					_profiles = defaultQuestions;
				}

				var _remoteDB = new PouchDB("http://localhost:5984/profile_database");
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
        addProfile: function() {},
        updateProfile: function() {},
        deleteProfile: function() {},
		getProfile: function(level) {
			if (!_profiles) {
				return $q.when(_localDB.allDocs({
						include_docs: true
					}))
					.then(function(docs) {
						_profiles = docs.rows.map(function(row) {
							return row.doc;
						});

						// Listen for changes on the database.
						_localDB.changes({
							live: true,
							since: 'now',
							include_docs: true
						})
						.on('change', onDatabaseChange);

						return _profiles;
					});

			} else {
				// Vrátit nacachovaná (lokálně uložená) data
				return $q.when(_profiles);
			}
		},
		setLevel: function(level) {

		},
		getLevel: function() {

		}
	};

}]);
