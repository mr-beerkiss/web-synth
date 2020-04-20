var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var SAMPLE_RATE = 44100;
var desiredFrequency = 30; // 30hz
// Sine waves are just the sine function. The sine function naturally has a period of 2π, and we
// need to scale that into a period of (sample_rate / desired_frequency). So, the equation we use
// to generate the samples of our 30hz sine wave is y = sin(x * (2π / (44100 / 30))):
function generateSineWave(sampleRate, frequency) {
    var buf = [];
    var waveformSampleCount = sampleRate / frequency;
    for (var x = 0; x < waveformSampleCount; x += 1) {
        buf[x] = Math.sin(x * ((Math.PI * 2) / waveformSampleCount));
        buf[x] = Math.sin((x * Math.PI * 2) / waveformSampleCount);
    }
    return buf;
}
// Triangle waves start at -1, spend half a period rising linearly to 1, and then half a period
// linearly falling back down to -1. I found that the easiest way to think about this one was to
// treat it as a repeating piecewise function with one piece on each half of the waveform
function generateTriangleWave(sampleRate, frequency) {
    var buf = [];
    var waveformSampleCount = sampleRate / frequency;
    // triangle wave; goes from -1 to 1 for one half the period, and 1 to -1 the other half
    for (var x = 0; x < waveformSampleCount; x += 1) {
        // Number of half-periods of this wave that this sample lies on.
        var halfPeriodIx = x / (waveformSampleCount / 2);
        var isClimbing = Math.floor(halfPeriodIx) % 2 == 0;
        // `%1` is a trick to get the decimal part of a number in JS
        var val = 2 * (halfPeriodIx % 1) - 1;
        // If we're on the second half of the waveform, we flip the sign
        if (!isClimbing) {
            val = -val;
        }
        buf[x] = val;
    }
    return buf;
}
// Square ewaves are at -1 for half of a period, and then 1 for the other half
function generateSquareWave(sampleRate, frequency) {
    var buf = [];
    var waveformSampleCount = sampleRate / frequency;
    for (var x = 0; x < waveformSampleCount; x += 1) {
        var halfPeriodIx = x / (waveformSampleCount / 2);
        var isFirstHalf = Math.floor(halfPeriodIx) % 2 == 0;
        buf[x] = isFirstHalf ? -1 : 1;
    }
    return buf;
}
// Sawtooth waves start at -1 and then rise linearly to 1 throughout the whole period, resetting
// back to -1 immediately at the beginning of the next period. It can be implemented rather easily
// by just repeating a scaled y = x function:
function generateSawtooth(sampleRate, frequency) {
    var buf = [];
    var waveformSampleCount = sampleRate / frequency;
    // sawtooth; climb from -1 to 1 over 1 period
    for (var x = 0; x < waveformSampleCount; x += 1) {
        // what fraction of the way we are through the current period
        var periodIxFract = (x / waveformSampleCount) % 1;
        // scale from [0, 1] to [-1, 1]
        buf[x] = periodIxFract * 2 - 1;
    }
    return buf;
}
function createOscillator(ctx, workletHandle) {
    // create an oscillator that outputs a 2hz triangle wave
    var oscillator = new OscillatorNode(ctx);
    oscillator.frequency.value = 2;
    oscillator.type = "triangle";
    oscillator.start();
    // Map the oscillator's output range from [-1, 1] to [0, 1]
    var oscillatorCSN = new ConstantSourceNode(ctx);
    // Add one to the output signals, making the range [0, 2]
    var oscillatorGain = new GainNode(ctx);
    // Divide the result by 2, making the range [0, 1]
    oscillatorGain.gain.value = 0.5;
    // TODO: Verify if this is right param, the tutorial source says `csn.offset`
    oscillator.connect(oscillatorCSN.offset);
    oscillatorCSN.connect(oscillatorGain);
    oscillatorCSN.start();
    // `oscillatorGain` now outputs a signal in the proper range to modulate our mix param
    var dimension0Mix = workletHandle.parameters.get("dimension_0_mix");
    oscillatorGain.connect(dimension0Mix);
}
function init() {
    return __awaiter(this, void 0, void 0, function () {
        var ctx, workletHandle, waveformSampleCount, wavetableDef, dimensionCount, waveformsPerDimension, samplesPerDimension, tableSamples, dimensionIx, waveformIx, sampleIx, res, moduleBytes;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    ctx = new AudioContext();
                    return [4 /*yield*/, ctx.audioWorklet.addModule("/WaveTableNodeProcessor.js")];
                case 1:
                    _a.sent();
                    workletHandle = new AudioWorkletNode(ctx, "wavetable-node-processor");
                    settingsUI(ctx, workletHandle);
                    waveformSampleCount = SAMPLE_RATE / desiredFrequency;
                    wavetableDef = [
                        [
                            generateSineWave(SAMPLE_RATE, desiredFrequency),
                            generateTriangleWave(SAMPLE_RATE, desiredFrequency),
                        ],
                        [
                            generateSquareWave(SAMPLE_RATE, desiredFrequency),
                            generateSawtooth(SAMPLE_RATE, desiredFrequency),
                        ],
                    ];
                    dimensionCount = 2;
                    waveformsPerDimension = 2;
                    samplesPerDimension = waveformSampleCount * waveformsPerDimension;
                    tableSamples = new Float32Array(dimensionCount * waveformsPerDimension * waveformSampleCount);
                    for (dimensionIx = 0; dimensionIx < dimensionCount; dimensionIx += 1) {
                        for (waveformIx = 0; waveformIx < waveformsPerDimension; waveformIx += 1) {
                            for (sampleIx = 0; sampleIx < waveformSampleCount; sampleIx += 1) {
                                tableSamples[samplesPerDimension * dimensionIx +
                                    waveformSampleCount * waveformIx +
                                    sampleIx] = wavetableDef[dimensionIx][waveformIx][sampleIx];
                            }
                        }
                    }
                    return [4 /*yield*/, fetch("./wavetable.wasm")];
                case 2:
                    res = _a.sent();
                    return [4 /*yield*/, res.arrayBuffer()];
                case 3:
                    moduleBytes = _a.sent();
                    // Send the Wasm module, waveform data, and wavetable settings over to the processor thread
                    workletHandle.port.postMessage({
                        arrayBuffer: moduleBytes,
                        waveformsPerDimension: waveformsPerDimension,
                        dimensionCount: dimensionCount,
                        waveformLength: waveformSampleCount,
                        // baseFrequency
                        // FIXME: Rename
                        baseFrequency: desiredFrequency,
                        tableSamples: tableSamples
                    });
                    workletHandle.connect(ctx.destination);
                    return [2 /*return*/, ctx];
            }
        });
    });
}
// TODO: Remove global vars
var ready = false;
var playing = false;
var audioContext = null;
function playHandler(e) {
    return __awaiter(this, void 0, void 0, function () {
        var error_1, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    if (!!ready) return [3 /*break*/, 2];
                    return [4 /*yield*/, init()];
                case 1:
                    audioContext = _a.sent();
                    ready = true;
                    info("Audio context ready...");
                    _a.label = 2;
                case 2: return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    err("Error trying to init audioContext", error_1);
                    return [2 /*return*/];
                case 4:
                    if (!audioContext) {
                        throw new Error("Whoops, something went very wrong");
                    }
                    _a.label = 5;
                case 5:
                    _a.trys.push([5, 9, , 10]);
                    if (!!playing) return [3 /*break*/, 7];
                    return [4 /*yield*/, audioContext.resume()];
                case 6:
                    _a.sent();
                    info("Starting playing...");
                    e.target.innerText = "Stop";
                    return [3 /*break*/, 8];
                case 7:
                    audioContext.suspend();
                    info("Stop");
                    e.target.innerText = "Play";
                    _a.label = 8;
                case 8:
                    playing = !playing;
                    return [3 /*break*/, 10];
                case 9:
                    error_2 = _a.sent();
                    err("Error occurred attempting to control sound", error_2);
                    return [3 /*break*/, 10];
                case 10: return [2 /*return*/];
            }
        });
    });
}
function settingsUI(ctx, workletHandle) {
    gainControl(ctx);
    freqControl(workletHandle);
    // TODO: Toggle oscillator
    //createOscillator(ctx, workletHandle);
}
function freqControl(workletHandle) {
    var inputEl = document.querySelector("#freq-control");
    inputEl.addEventListener("input", function (e) {
        var val = event.target.value;
        console.log("Frequency: " + val + "hz");
        workletHandle.parameters.get("frequency").value = val;
    });
    inputEl.addEventListener("click", function (e) {
        info("Frequency control released. New gain value = " + workletHandle.parameters.get("frequency").value);
    });
}
// FIXME: Gain control doesn't appear to be working
function gainControl(ctx) {
    // TODO: Why division by 150 (OG code)
    // globalGain.gain.value = 5/150;
    // TODO: MDN recommends not using `new GainNode()` directly, why?
    var gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    // NOTE: `oninput` doesn't work on IE10
    var inputEl = document.querySelector("#gain-control");
    inputEl.addEventListener("input", function (e) {
        console.log("New Gain: " + event.target.value);
        gainNode.gain.setValueAtTime(event.target.value, ctx.currentTime);
    });
    inputEl.addEventListener("click", function (e) {
        info("Gain control released. New gain value = " + gainNode.gain.value);
    });
}
function info(msg) {
    console.log(msg);
    writeMessage("info", msg);
}
function err(msg, error) {
    console.error(msg, error);
    var errMsg = error ? msg + ". Details: " + e.message : msg;
    writeMessage("error", errMsg);
}
var msgLog;
function writeMessage(type, msg) {
    if (!msgLog) {
        msgLog = document.querySelector(".message-log");
    }
    var p = document.createElement("p");
    p.classList.add("message-log-" + type);
    p.textContent = msg;
    msgLog.appendChild(p);
}
function onLoadHandler(e) {
    info("Hello world!");
    var button = document.querySelector("#play-button");
    button.onclick = playHandler;
}
window.onload = onLoadHandler;
