'use strict';
angular.module('polda-quiz.services', [])
	.factory('GameplayService', ['$q', 'ContentService', 'ProfileService', function($q, ContentService, ProfileService) {

		var _game = {
			gameSetup: {
				level: 0,
				generatedQuestions: []
			},
			continue: false,
			timeLimit: 10,
			questionNumber: 5,
			questions: {},
			clueUsed: false,
			activeQuestion: 0,
			activeProfile: 0,
			selectedOption: 0,
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
			getLevel: function() {
				return ProfileService.getLevel();
			},
			setLevel: function(level) {
				ProfileService.updateLevel(level);
			},
			setGameQuestions: function() {
				_game.continue = true;
				return ContentService.getGameQuestions(ProfileService.getLevel()).then(function(data){
					_game.questions = angular.copy(data);
				});
			},
			setActiveQuestion: function(index) {
				return _game.questions[index];
			},
			setActiveQuestionAnswered: function(state) {
				_game.isActiveQuestionsAnswered = state;
			},
			setNextActiveQuestion: function(state) {
				_game.activeQuestion++;
			},
			setSelectedOption: function(selection) {
				_game.selectedOption = selection;
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
				ProfileService.setStatistics(_game.gameStatistics.successQuestions, _game.gameStatistics.failedQuestions);
			},
			getClue: function() {
				var limit = 0;
				while (limit < 1) {
					for (var i = 0; i < _game.questions[_game.activeQuestion].options.length; i++) {
						if (!_game.questions[_game.activeQuestion].options[i].isAnswer) {
							_game.questions[_game.activeQuestion].options.splice(i, 1);
							limit++;
						}
					}
				}
				_game.clueUsed = true;
			},
			restoreGame: function() {
				_game.gameSetup.generatedQuestions = [];
				_game.gameStatistics.failedQuestions = 0;
				_game.gameStatistics.successQuestions = 0;
				_game.gameStatistics.answeredQuestions = 0;
				_game.activeQuestion = 0;
				_game.selectedOption = 0;
				_game.clueUsed = false;
				_game.questions = {};
			}
		};
	}])

.factory('ContentService', ['$q', '$ionicPopup', '$log', '$http', function($q, $ionicPopup, $log, $http) {
	var _localDB;
	var _questions; //lokalni cache pro otazky

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
			_localDB = new PouchDB('quiz_questions_db009', {
				adapter: 'websql'
			});
			if (!_questions) {
				return $q.when(_localDB.allDocs({
						include_docs: true
					}))
					.then(function(docs) {
						//console.log("naplneni cache profilem z lokalni db");
						_questions = docs.rows.map(function(row) {
							return row.doc;
						});
						if (_questions.length === 0) {
							$http.get("./content/questions.json").success(function(data) {
								_localDB.bulkDocs(data).then(function(docs) {
									_questions = data;
									//console.log("defaultni naplneni profilem v pripade prazdne lokalni db");
								}).catch(function(err) {
									//console.log("defaultni naplneni se nepovedlo");
									console.log(err);
								});
							});
						}

						_localDB.changes({
							live: true,
							since: 'now',
							include_docs: true
						}).on('change', onDatabaseChange);

						return _questions;
					});
			} else {
				//console.log("vraceni chache profilu");
				return $q.when(_questions);
			}

			//DOCASNE VYPNUTA SYNCHRONIZACE CONTENTU
			/*var _remoteDB = new PouchDB("http://localhost:5984/quiz_database");
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
					var alertPopup = $ionicPopup.alert({
						title: 'Chyba synchronizace!',
						template: 'Nelze přistoupit k serverovým datům'
					});
					alertPopup.then(function(res) {
						$log.log('chyba při synchronizaci');
					});
				});*/
		},
		getQuestions: function() {
			// Vrátit nacachovaná (lokálně uložená) data
			return $q.when(_questions);
		},
		getGameQuestions: function(level) {
			var arr = [];
			for (var i = 0; i < _questions.length; i++) {
				// prozatim zrusena kontrola levelu otazky, vraceno vse
				//if (_questions[i].level === parseInt(level)) {
				//	arr.push(_questions[i]);
				//}
				shuffle(_questions[i].options);
				arr.push(_questions[i]);
			}

			var n = 5; // toto cislo prijde zmenit na 10 az bude dostatecny pocet otazek!!!!!
			if (n < arr.length) {
				var result = []
				result = arr;
				result = shuffle(arr);
				result = result.slice(0, n);
			} else {
				throw new RangeError("málo otázek");
			}
			return $q.when(result);
		}
	};
}])

.factory('ProfileService', ['$q', function($q) {
	var _localDB;
	var _profile;

	function onDatabaseChange(change) {
		//console.log(change);
		var index = findIndex(_profile, change.id);
		var profile = _profile[index];
		if (change.deleted) {
			if (profile) {
				//_profile.splice(index, 1); // delete
			}
		} else {
			if (profile && profile._id === change.id) {
				//_profile[index] = change.doc; // update
				_profile = change.doc; // update
			} else {
				//_profile.splice(index, 0, change.doc); // insert
				_profile = change.doc; // insert
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

	function setProfile(profile) {
		_localDB.get(profile._id).then(function(doc) {
			doc.level = profile.level;
			return _localDB.put(doc);
		}).then(function() {
			return _localDB.get(profile._id);
		}).then(function(doc) {
			//console.log(doc);
		});
	}

	return {
		initDB: function() {
			_localDB = new PouchDB('quiz_profile_db009', {
				adapter: 'websql'
			});
			if (!_profile) {
				return $q.when(_localDB.allDocs({
						include_docs: true
					}))
					.then(function(docs) {
						//console.log("naplneni cache profilem z lokalni db");
						_profile = docs.rows.map(function(row) {
							return row.doc;
						});
						if (_profile.length === 0) {
							var defaultProfile = {
								_id: "1",
								name: 'Nick',
								level: 0,
								statistics: {
									successQuestions: 0,
									failedQuestions: 0,
									answeredQuestions: 0
								}
							};
							_localDB.bulkDocs([defaultProfile]).then(function(docs) {
								_profile = defaultProfile;
								//console.log("defaultni naplneni profilem v pripade prazdne lokalni db");
							}).catch(function(err) {
								//console.log("defaultni naplneni se nepovedlo");
								console.log(err);
							});
						} else {
							_profile = _profile[0];
						}

						_localDB.changes({
							live: true,
							since: 'now',
							include_docs: true
						}).on('change', onDatabaseChange);

						return _profile;
					});
			} else {
				//console.log("vraceni chache profilu");
				return $q.when(_profile);
			}
		},
		getStatistics: function() {
			return _statistics;
		},
		setStatistics: function(success, failure) {
			_profile.statistics.successQuestions += success;
			_profile.statistics.failedQuestions += failure;
			_profile.statistics.answeredQuestions += success + failure;
		},
		resetProfile: function() {
			_profile = {
				_id: "1",
				name: 'Odpadlík',
				level: 0,
				statistics: {
					successQuestions: 0,
					failedQuestions: 0,
					answeredQuestions: 0
				}
			};
			setProfile(_profile);
			return _profile;
		},
		getProfile: function() {
			if (!_profile) {
				_localDB.allDocs({
					include_docs: true
				}).then(function(doc) {
					_profile = doc.rows;
				}).catch(function(err) {
					// chyba
				});
			} else {
				return _profile;
			}
		},
		setLevel: function(lvl) {
			if (parseInt(lvl) >= 1) {
				_profile.level = lvl;
				setProfile(_profile);
			}
		},
		getLevel: function() {
			return _profile.level;
		}
	};

}]);
