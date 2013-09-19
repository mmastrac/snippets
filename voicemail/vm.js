var app = angular.module('app', ['ngResource']);

var FORMAT = "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20json%20where%20url%3D%22{{ url }}%22&format=json&jsonCompat=new";

function load() {

}

app.controller("VoicemailController", function($scope, twilio) {
	$scope.calls = twilio.calls();
});

try {
	app.value("configuration", JSON.parse(location.hash.slice(1)));
} catch (e) {
	alert("Error parsing config: " + e);
	throw e;
}

app.factory("twilio", function($interpolate, $http, configuration) {
	var ROOT_URL = $interpolate("https://{{ config.account }}:{{ config.key }}@api.twilio.com/2010-04-01/Accounts/{{ config.account }}")
		({ config: configuration });
	console.log(ROOT_URL);

	return {
		calls: function() { return $http({ method: 'GET', url: ROOT_URL + "/Calls.json" + (configuration.phonex ? "?To=" + encodeURIComponent(configuration.phone) : "") }).then(function(calls) { 
			calls = calls.calls;
			calls.forEach(function(call) {
				console.log(call);
				call.recordings = this.recordings(call.sid);
				call.start_time = new Date(call.start_time);
				call.end_time = new Date(call.end_time);
			}.bind(this));
			return calls; 
		}.bind(this)); },
		recordings: function(call) { return $http({ method: 'GET', url: ROOT_URL + "/Calls/" + call + "/Recordings.json", cache: true }).then(function(recordings) {
			if (!recordings)
				return null;
			recordings = recordings.recordings;
			recordings.forEach(function(recording) {
				recording.absolute_audio_uri = "https://api.twilio.com" + recording.uri.replace('.json', '.mp3');
				recording.transcriptions = this.transcriptions(recording.sid);
			}.bind(this));
			return recordings;
		}.bind(this)); },
		transcriptions: function(recording) {
			return $http({ method: 'GET', url: ROOT_URL + "/Recordings/" + recording + "/Transcriptions.json", cache: true }).then(function(transcriptions) {
				return transcriptions && transcriptions.transcriptions;
			}.bind(this));
		}
	};
});

app.config(function ($provide) {
	$provide.decorator("$http", function($delegate, $interpolate, $q) {
		return function(url) {
			var cacheKey = 'cache_' + url.url;
			url.url = $interpolate(FORMAT)({ url: encodeURIComponent(url.url) });
			if (localStorage[cacheKey] && url.cache)
				return $q.when(JSON.parse(localStorage[cacheKey]));
			return $delegate(url).then(function(results) { 
				var actualResults = results.data.query.results && results.data.query.results.json;
				if (actualResults) {
					if (url.cache) {
						localStorage[cacheKey] = JSON.stringify(actualResults);
					}
					return actualResults;
				}
				return null;
			});
		};
	});
});

app.config(function($sceDelegateProvider) {
	$sceDelegateProvider.resourceUrlWhitelist(['api\\.twilio\\.com']);
});
