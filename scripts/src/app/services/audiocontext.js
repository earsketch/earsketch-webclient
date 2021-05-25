/**
 * A service that simply returns a single instance of an audio context. In most
 * cases it is wasteful to have more than one audio context active in the
 * browser, so using this one for everything is more efficient.
 *
 * @module audioContext
 * @author Creston Bunch
 */
app.factory('audioContext', function audioContextFactory() {

    var context = new (window.AudioContext || window.webkitAudioContext)({
        latencyHint: 'interactive',
        sampleRate: 44100
    });

    // master node at which all effects converge
    context.master = context.createGain();

    // this is a hack to keep the audio context from ever suspending
    // For some reason, Firefox will randomly suspend it and
    context.onstatechange = function() {
        if (context.state === "suspended") {
            context.resume();
        }
    };

    return context;

});

