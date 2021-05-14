describe('AudioLibrary tests', function() {

    var mock, audioContext, audioLibrary, $httpBackend, $rootScope, $q;

    // mock module dependencies
    beforeEach(function() {
        // TODO: figure out a way to ignore dependencies or mock them universally
        // or something
        angular.module('ui.router',[]);
        angular.module('ui.bootstrap',[]);
        angular.module('ui.utils',[]);
        angular.module('ui.layout',[]);
        angular.module('ngAnimate',[]);
        angular.module('ngFileUpload',[]);
        angular.module('angular-clipboard',[]);
        angular.module('angular-confirm',[]);
        angular.module('rzModule',[]);
        angular.module('uiSwitch',[]);
        angular.module('infinite-scroll',[]);
        angular.module('ui.scroll',[]);
        angular.module('ui.scroll.grid',[]);
    });

    // load the earsketch app
    beforeEach(module('EarSketchApp'));

    // Here we mock the HTTP calls made by Angular
    beforeEach(inject(function($injector) {
        audioContext = $injector.get('audioContext');
        $httpBackend = $injector.get('$httpBackend');
        $rootScope = $injector.get('$rootScope');
        $q = $injector.get('$q');

        var url = new RegExp(URL_LOADAUDIO);
        $httpBackend.when(
            'GET', url
        ).respond(function(method, url, data, headers, params) {
            // create a test audio buffer to return
            if (params.key == 'TEST_KEY') {
                try {
                    var audioCtx = new AudioContext();
                } catch (e) {
                    console.log(e);
                }
                return [200, HELLO_BUFFER];
            }

            return [404, 'Not found.'];
        });

        $httpBackend.when(
            'GET', URL_DOMAIN + '/services/audio/getaudiokeys?tag='
        ).respond(
            {'audioFiles': [
                {'file_key': 'TEST_KEY'} //... and there are more properties
            ]}
        );

        $httpBackend.when(
            'GET', URL_DOMAIN + '/services/audio/getaudiotags'
        ).respond(
            {'audioTags': [
                {'file_key': 'TEST_KEY'} //... and there are more properties
            ]}
        );

        $httpBackend.when(
            'GET', URL_DOMAIN + '/services/audio/verifyclip?key=TEST_KEY'
        ).respond({'file_key': 'TEST_KEY'});

        $httpBackend.when(
            'GET', URL_DOMAIN + '/services/audio/verifyclip?key=NOT_VALID'
        ).respond('Not found.');

        $httpBackend.when(
            'GET', URL_DOMAIN + '/services/audio/getunstretchedsample?key=TEST_KEY'
        ).respond(HELLO_BUFFER);
    }));

    // Here we load the Audio Library service for unit testing
    beforeEach(inject(function($injector) {
        audioLibrary = $injector.get('audioLibrary');
    }));

    afterEach(function() {
        $httpBackend.verifyNoOutstandingExpectation();
        $httpBackend.verifyNoOutstandingRequest();
    });

    afterEach(function() {
        // close the audio context after each test so we don't open too many
        // only seems to be a problem in Chrome
        audioContext.close();
    });
    
    it('should get the list of audio tags', function() {
        var promise = audioLibrary.getAudioTags();
        // note that this test does not need to be asynchronous because
        // flushing the HTTP backend will force Angular to resolve the promises
        // synchronously
        promise.then(function(result) {
            expect(result).toEqual(['TEST_KEY']);
        });
        $httpBackend.flush();
    });

    it('should get the list of audio keys submitted by the ES users', function() {
        var promise = audioLibrary.getUserAudioTags();
        // note that this test does not need to be asynchronous because
        // flushing the HTTP backend will force Angular to resolve the promises
        // synchronously
        promise.then(function(result) {
            expect(result).toEqual(['TEST_KEY']);
        });
        $httpBackend.flush();
    });

    // TODO: test getAudioFolders

    it('should fetch a correct audio clip', function(done) {
        var promise = audioLibrary.getAudioClip('TEST_KEY', 120, 1)

        promise.then(function(result) {
            // This is the best we can do unless someone knows how to get the
            // left/right channel data and we compare base64 encoded strings
            // of the left and right channels or we convert it back into ogg
            expect(result.numberOfChannels).toEqual(2);
            // Chrome and firefox disagree whether this should be 79488 or 79489
            expect(result.length).toBeGreaterThan(79487);
            expect(result.length).toBeLessThan(79900);
            expect(result.sampleRate).toEqual(44100);
            expect(result.duration).toBeCloseTo(1.8, 1);
            // delay the call to done() to prevent rootScope digest in progress
            // also a pretty bad solution, but the best I can do for now
            setTimeout(done, 100);
        }).catch(function(err) {
            expect(err.toString()).toEqual(null);
            setTimeout(done, 100);
        });

        $httpBackend.flush();
        // Delay the digest cycle to wait for the HTTP requests to go through
        // then force the decodeAudioData promise to resolve
        // Not the best way to go about this, but probably the easiest
        setTimeout($rootScope.$digest, 100);
    });

    it('should not be able to find this clip', function(done) {
        var promise = audioLibrary.getAudioClip('NOT_VALID', 120, 1)

        promise.then(function(result) {
            expect('Somehow it found this clip.').toEqual(null);
            setTimeout(done, 100);
        }).catch(function(err) {
            // this is a success!
            expect(err.toString()).toEqual(
                'ReferenceError: File key NOT_VALID does not exist'
            );
            setTimeout(done, 100);
        });

        $httpBackend.flush();
        setTimeout($rootScope.$digest, 100);
    });

    it('should not make two requests for the same clip', function(done) {
        var promise1 = audioLibrary.getAudioClip('TEST_KEY', 120, 1);
        var promise2 = audioLibrary.getAudioClip('TEST_KEY', 120, 1);

        expect(promise1).toBe(promise2);

        promise1.then(function(result) {
            expect(result.numberOfChannels).toEqual(2);
            expect(result.length).toBeGreaterThan(79487);
            expect(result.length).toBeLessThan(79810);
            expect(result.sampleRate).toEqual(44100);
            expect(result.duration).toBeCloseTo(1.8, 1);
            setTimeout(done, 100);
        }).catch(function(err) {
            expect(err.toString()).toEqual(null);
            setTimeout(done, 100);
        });

        $httpBackend.flush();
        setTimeout($rootScope.$digest, 100);
    });

    it('should load the cached clip', function(done) {
        var promise1 = audioLibrary.getAudioClip('TEST_KEY', 120, 1);

        promise1.then(function(result) {
            expect(result.numberOfChannels).toEqual(2);
            expect(result.length).toBeGreaterThan(79487);
            expect(result.length).toBeLessThan(79810);
            expect(result.sampleRate).toEqual(44100);
            expect(result.duration).toBeCloseTo(1.8, 1);

            var promise2 = audioLibrary.getAudioClip('TEST_KEY', 120, 1);
            promise2.then(function(result) {
                expect(result.numberOfChannels).toEqual(2);
                expect(result.length).toBeGreaterThan(79487);
                expect(result.length).toBeLessThan(79810);
                expect(result.sampleRate).toEqual(44100);
                expect(result.duration).toBeCloseTo(1.8, 1);
                setTimeout(done, 100);
            });

            // notice we don't flush the HTTP backend, if it's loading from
            // the cache then we need only resolve the promise
            setTimeout($rootScope.$digest, 100);
        }).catch(function(err) {
            expect(err.toString()).toEqual(null);
            setTimeout(done, 100);
        });

        $httpBackend.flush();
        setTimeout($rootScope.$digest, 100);
    });

});
