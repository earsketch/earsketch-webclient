import * as RecorderService from "./esrecorder"

app.directive('levelMeter', function () {
    return {
        restrict: 'E',
        link: function (scope, elem) {
            var h = 15;
            var w = 250;
            var sw = 2; // stroke width
            var rx =  3; //rounded corner radius

            var rectAttrs = {
                x: sw,
                y: sw,
                width: w-sw*2,
                height: h-sw*2
            };

            var svg = d3.select(elem.parent()[0]).append('svg')
                .attr({
                    width: w,
                    height: h
                });

            createGradient(svg[0][0],'meter-gradient',[
                {offset:'10%', 'stop-color':'red'},
                {offset:'40%','stop-color':'yellow'},
                {offset:'100%','stop-color':'#00FF00'}
            ]);

            var frame = svg.append('rect')
                .attr(rectAttrs)
                .attr('rx',rx)
                .attr('fill','url(#meter-gradient)')
                .style({
                    stroke: 'gray',
                    'stroke-width': sw
                });

            var bar = svg.append('rect')
                .attr(rectAttrs)
                .attr('rx',rx)
                .attr({
                    x: sw,
                    width: w-sw*2
                })
                .attr('class','level-meter-bar');
                // .style({
                //     fill: '#181818',
                //     stroke: 'none',
                //     'stroke-width': 0
                // });

            function draw() {
                var db = 20 * Math.log10(RecorderService.properties.meterVal);
                var dbMin = -36;
                if (db < dbMin) {
                    db = dbMin;
                }
                var val = (db + (-dbMin)) / (-dbMin);
                var rVal = (1 - val * 1.3);
                if (rVal < 0) {
                    rVal = 0;
                }
                bar.attr('width', (w - sw*2) * rVal);

                requestAnimationFrame(draw);
            }

            requestAnimationFrame(draw);

            // svg:   the owning <svg> element
            // id:    an id="..." attribute for the gradient
            // stops: an array of objects with <stop> attributes
            function createGradient(svg,id,stops){
              var svgNS = svg.namespaceURI;
              var grad  = document.createElementNS(svgNS,'linearGradient');
              grad.setAttribute('id',id);
              for (var i=0;i<stops.length;i++){
                var attrs = stops[i];
                var stop = document.createElementNS(svgNS,'stop');
                for (var attr in attrs){
                  if (attrs.hasOwnProperty(attr)) stop.setAttribute(attr,attrs[attr]);
                }
                grad.appendChild(stop);
              }

              var defs = svg.querySelector('defs') ||
                  svg.insertBefore( document.createElementNS(svgNS,'defs'), svg.firstChild);
              return defs.appendChild(grad);
            }
        }
    };
});

app.directive('visualMetronome', function () {
    return {
        restrict: 'E',
        templateUrl: 'templates/recorder.html',
        link: function (scope, elem) {

            var element = document.querySelector('.counter-meter');
            var showMetronome = true;

            element.className = 'counter-meter topright';

            scope.$watch('recorder.properties.useMetro', function (val) {
                if (!val) {
                    element.className = 'counter-meter hide-metronome';
                    showMetronome = false;
                } else {
                    element.className = 'counter-meter topright';
                    showMetronome = true;
                }
            });

            RecorderService.callbacks.clickOnMetronome = function (val) {
                if (showMetronome) {
                    switch (val) {
                        case 0:
                            element.className = 'counter-meter topright';
                            break;
                        case 1:
                            element.className = 'counter-meter bottomright';
                            break;
                        case 2:
                            element.className = 'counter-meter bottomleft';
                            break;
                        case 3:
                            element.className = 'counter-meter topleft';
                            break;
                    }
                }
            };
        }
    }
});

app.directive('drawWaveform', function () {
    return {
        restrict: 'E',
        link: function (scope, elem) {
            var w = 420;
            var h = 80;

            var canvas = d3.select(elem[0]).append('canvas')
                .attr({
                    width: w,
                    height: h
                });
            var ctx = canvas.node().getContext('2d');
            ctx.fillStyle = 'gray';
            var amp = h / 2;

            var SPACING = 3;
            var BAR_WIDTH = 1;
            var numBars = Math.round(w / SPACING);
            var rafId = null; //requestAnimationFrameId

            ctx.clearRect(0, 0, w, h);

            RecorderService.callbacks.showSpectrogram = function () {
                if (!rafId) {
                    drawSpectrogram();
                }
            };

            RecorderService.callbacks.showRecordedWaveform = function () {
                if (rafId) {
                    window.cancelAnimationFrame(rafId);
                    rafId = undefined;
                }

                if (RecorderService.buffer) {
                    drawWaveform(RecorderService.buffer.getChannelData(0));
                } else {
                    drawWaveform(new Float32Array(0));
                }
            };

            function drawWaveform(buf) {
                var step = Math.ceil(buf.length / w);
                ctx.clearRect(0, 0, w, h);
                ctx.fillStyle = 'gray';

                for (var i = 0; i < w; i++) {
                    var max = -1.0;
                    var min = 1.0;

                    for (var j = 0; j < step; j++) {
                        var sample = buf[i*step + j];
                        if (sample < min) {
                            min = sample;
                        }
                        if (sample > max) {
                            max = sample;
                        }
                    }

                    ctx.fillRect(i, (1+min)*amp, 1, Math.max(1,(max-min)*amp));
                }
            }

            // analyzer draw code here
            function drawSpectrogram(time) {
                var freqByteData = new Uint8Array(RecorderService.analyserNode.frequencyBinCount);
                RecorderService.analyserNode.getByteFrequencyData(freqByteData);

                ctx.clearRect(0, 0, w, h);
                ctx.fillStyle = '#F6D565';
                ctx.lineCap = 'round';
                var multiplier = RecorderService.analyserNode.frequencyBinCount / numBars;

                // Draw rectangle for each frequency bin.
                for (var i = 0; i < numBars; ++i) {
                    var magnitude = 0;
                    var offset = Math.floor( i * multiplier );
                    // gotta sum/average the block, or we miss narrow-bandwidth spikes
                    for (var j = 0; j< multiplier; j++)
                        magnitude += freqByteData[offset + j];
                    magnitude = magnitude / multiplier;
                    var magnitude2 = freqByteData[i * multiplier];
                    ctx.fillStyle = "hsl( " + Math.round((i*360)/numBars) + ", 100%, 50%)";
                    ctx.fillRect(i * SPACING, 3/2*h, BAR_WIDTH, -magnitude*(3/5));
                }

                rafId = window.requestAnimationFrame(drawSpectrogram);
            }
        }
    };
});
