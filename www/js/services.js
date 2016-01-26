'use strict';
angular.module('polda-quiz.services', [])
	.factory('GameplayService', ['$q', 'ContentService', 'ProfileService', function($q, ContentService, ProfileService) {

		var _game = {
			gameSetup: {
				level: 0,
				generatedQuestions: []
			},
			continue: false,
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
			getLevel: function() {
				return ProfileService.getLevel();
			},
			setLevel: function(level) {
				ProfileService.updateLevel(level);
				//ProfileService.getLevel() = level;
			},
			setGameQuestions: function() {
				//nacteni sady otazek pro dane kolo
				console.log(ProfileService.getLevel());
				_game.questions = ContentService.getGameQuestions(ProfileService.getLevel());
				_game.questions.continue = true;
			},
			setActiveQuestion: function() {
				_game.activeQuestion = {};
				_game.isActiveQuestionsAnswered = false;

				//console.log(_game.questions);
				if (_game.questions.length > 0) {
					var randomId = parseInt(Math.floor(Math.random() * _game.questions.length));
					//console.log('nahodne id: ' + randomId + ' a delka pole: ' + _game.questions.length);
					var randomQuestion = _game.questions[randomId];
					//TODO odebrat otazku z pole otazek
					shuffle(randomQuestion.options);
					_game.activeQuestion = randomQuestion;
				}

				if (_game.activeQuestion === undefined || _game.activeQuestion === null) {
					return null;
				} else {
					return _game.activeQuestion;
				}
			},
			setActiveQuestionAnswered: function(state) {
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
				ProfileService.setStatistics(_game.gameStatistics.successQuestions, _game.gameStatistics.failedQuestions);
			},
			restoreGame: function() {
				_game.gameSetup.generatedQuestions = [];
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
		level: 0
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
		level: 0
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
		level: 0
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
		level: 5
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
		level: 5
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
		level: 5
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
			_localDB = new PouchDB('quiz_questions_db3', {
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
				.then(function() {
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
							// prozatim nahradit pop-up konzolovym vypisem
							$log.log('chyba při synchronizaci');
							/*var alertPopup = $ionicPopup.alert({
								title: 'Chyba synchronizace!',
								template: 'Nelze přistoupit k serverovým datům'
							});
							alertPopup.then(function(res) {
								$log.log('chyba při synchronizaci');
							});*/
						});
				});
		},
		getQuestions: function() {
			// Vrátit nacachovaná (lokálně uložená) data
			return $q.when(_questions);
		},
		getGameQuestions: function(level) {
			var arr = [];
			for (var i = 0; i < _questions.length; i++) {
				if (_questions[i].level === parseInt(level)) {
					arr.push(_questions[i]);
				}
			}
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
	var _profile;

	function onDatabaseChange(change) {
		var index = findIndex(_profile, change.id);
		var profile = _profile[index];
		//update scope
		if (change.deleted) {
			if (profile) {
				_profile.splice(index, 1); // delete
			}
		} else {
			if (quesprofiletion && profile._id === change.id) {
				_profile[index] = change.doc; // update
			} else {
				_profile.splice(index, 0, change.doc); // insert
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
		_localDB.put(profile, function callback(err, result) {
			if (!err) {
				console.log('Successfully posted a profile!');
			}
		});
	}

	return {
		initDB: function() {
			_localDB = new PouchDB('quiz_profile_db3', {
				adapter: 'websql'
			});
			if (!_profile) {
				return $q.when(_localDB.allDocs({
						include_docs: true
					}))
					.then(function(docs) {
						console.log("naplneni cache profilem z lokalni db");
						_profile = docs.rows.map(function(row) {
							return row.doc;
						});
						//console.log(_profile);
						if (_profile.length === 0) {
							var defaultProfile = {
								_id: "1",
								name: 'Nick',
								level: 5,
								statistics: {
									successQuestions: 0,
									failedQuestions: 0,
									answeredQuestions: 0
								}
							};
							_localDB.bulkDocs([defaultProfile]).then(function(docs) {
								_profile = defaultProfile;
								console.log("defaultni naplneni profilem v pripade prazdne lokalni db");
							}).catch(function(err) {
								console.log("defaultni naplneni se nepovedlo");
								console.log(err);
							});
						}

						_localDB.changes({
							live: true,
							since: 'now',
							include_docs: true
						}).on('change', onDatabaseChange);

						return _profile;
					});
			} else {
				console.log("vraceni chache profilu");
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
				level: 1,
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
					// oh noes! we got an error
				});
			} else {
				//doplnit vraceni cache dat
				return _profile;
			}
		},
		setLevel: function(lvl) {
			if (parseInt(lvl) >= 0) {
				_profile.level = lvl;
				setProfile(_profile);
			}
		},
		getLevel: function() {
			return _profile[0].level;
		}
	};

}]);
