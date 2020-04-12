const SAMPLE_RATE = 44100;
const desiredFrequency = 30;  // 30hz

// Sine waves are just the sine function. The sine function naturally has a period of 2π, and we 
// need to scale that into a period of (sample_rate / desired_frequency). So, the equation we use 
// to generate the samples of our 30hz sine wave is y = sin(x * (2π / (44100 / 30))):
function generateSineWave(sampleRate, frequency) {
  const buf = [];

  const waveformSampleCount = sampleRate / frequency;
  
  for (let x=0; x < waveformSampleCount; x += 1) {
    // buf[x] = Math.sin(x * ((Math.PI * 2) / waveformSampleCount));
    buf[x] = Math.sin(x * Math.PI * 2 / waveformSampleCount);
  }

  return buf;
}

// Triangle waves start at -1, spend half a period rising linearly to 1, and then half a period 
// linearly falling back down to -1. I found that the easiest way to think about this one was to 
// treat it as a repeating piecewise function with one piece on each half of the waveform
function generateTriangleWave(sampleRate, frequency) {
  const buf = [];

  const waveformSampleCount = sampleRate / frequency;
  
  // triangle wave; goes from -1 to 1 for one half the period, and 1 to -1 the other half
  for (let x=0; x < waveformSampleCount; x += 1) {
    // Number of half-periods of this wave that this sample lies on.
    const halfPeriodIx = x / (waveformSampleCount / 2);
    const isClimbing = Math.floor(halfPeriodIx) % 2 == 0;
    // `%1` is a trick to get the decimal part of a number in JS
    let val = 2 * (halfPeriodIx % 1) - 1;

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
  const buf = [];

  const waveformSampleCount = sampleRate / frequency;

  for (let x = 0; x < waveformSampleCount; x += 1 ) {
    const halfPeriodIx = x / (waveformSampleCount / 2);
    const isFirstHalf = Math.floor(halfPeriodIx) % 2 == 0;

    buf[x] = isFirstHalf ? -1 : 1;
  }

  return buf;
}

// Sawtooth waves start at -1 and then rise linearly to 1 throughout the whole period, resetting 
// back to -1 immediately at the beginning of the next period. It can be implemented rather easily 
// by just repeating a scaled y = x function:
function generateSawtooth(sampleRate, frequency) {
  const buf = [];

  const waveformSampleCount = sampleRate / frequency;

  // sawtooth; climb from -1 to 1 over 1 period
  for (let x=0; x < waveformSampleCount; x += 1) {
    // what fraction of the way we are through the current period
    const periodIxFract = (x / waveformSampleCount) % 1;

    // scale from [0, 1] to [-1, 1]
    buf[x] = periodIxFract * 2 - 1;
  }

  return buf;
}

const buildWaveTableData(dimensionCount, waveformsPerDimension, waveformSampleCount) {
  // NOTE: The author felt a big 1D array is more efficient than using a real multi-dimensional 
  // array since all of the data is in the same allocation and the different waveforms are near 
  // each other in memory
  const waveTableData = new Float32Array(
    dimensionCount * waveformsPerDimension * waveformSampleCount
  );

  // wtf is this?
  const samplesPerDimension = -1;

  for (let dimensionIx = 0; dimensionIx < dimensionCount; dimensionIx += 1) {
    for (let waveformIx = 0; waveformIx < waveformsPerDimension; waveformIx += 1) {
      for (let sampleIx = 0; sampleIx < waveformSampleCount; sampleIx += 1) {
        const index = samplesPerDimension * dimensionIx + waveformSampleCount * waveformIx + sampleIx;
        waveTableData[index] = waveTableData[dimensionIx][waveformIx][sampleIx];
      }
    }
  }

  return waveTableData;
}

function createOscillator(ctx, workletHandle) {
  // create an oscillator that outputs a 2hz triangle wave
  const oscillator = new OscillatorNode(ctx);
  oscillator.frequency.value = 2;
  oscillator.type = 'triangle';
  oscillator.start();

  // Map the oscillator's output range from [-1, 1] to [0, 1]
  const oscillatorCSN = new ConstantSourceNode(ctx);
  // Add one to the output signals, making the range [0, 2]
  const oscillatorGain = new GainNode(ctx);
  // Divide the result by 2, making the range [0, 1]
  oscillatorGain.gain.value = 0.5;

  // TODO: Verify if this is right param, the tutorial source says `csn.offset`
  oscillator.connect(oscillatorCSN.offset);
  oscillatorCSN.connect(oscillatorGain);
  oscillatorCSN.start();

  // `oscillatorGain` now outputs a signal in the proper range to modulate our mix param
  const dimension0Mix = workletHandle.parameters.get('dimension_0_mix');
  oscillatorGain.connect(dimension0Mix);
}

!async function() {
  // Register our custom `AudioWorkletProcessor`, and create an `AudioWorkletNode` that serves as a
  // handle to an instance of one.
  const ctx = new AudioContext();
  await ctx.audioWorklet.addModule("/WaveTableProcessor.js");
  const workletHandle = new AudioWorkletNode(ctx, "wavetable-node-processor");

  const waveformSampleCount = SAMPLE_RATE / desiredFrequency;

  // Using those waveforms we generated earlier, construct a flat array of the waveform samples
  // which which to fill the wave table
  const wavetableDef = [
    [
      generateSineWave(SAMPLE_RATE, desiredFrequency),
      generateTriangleWave(SAMPLE_RATE, desiredFrequency)
    ],
    [
      generateSquareWave(SAMPLE_RATE, desiredFrequency),
      generateSawtooth(SAMPLE_RATE, desiredFrequency),
    ],
  ];

  const dimensionCount = 2; // probably wavetableDef.length
  const waveformsPerDimension = 2; // probably wavetableDef[x].length
  
  const samplesPerDimension = waveformSampleCount * waveformsPerDimension;

  const tableSamples = new Float32Array(
    dimensionCount * waveformsPerDimension * waveformSampleCount
  );

  for (let dimensionIx = 0; dimensionIx < dimensionCount; dimensionIx += 1) {
    for (let waveformIx = 0; waveFormIx < waveformsPerDimension; waveformIx +=1 ) {
      for (let sampleIx = 0; sampleIx < waveformSampleCount; sampleIx += 1) {
        tableSamples[
          samplesPerDimension * dimensionIx +
            waveformSampleCount * waveFormIx +
            sampleIx
        ] = wavetableDef[dimensionIx][waveformIx][sampleIx];
      }
    }
  }
  
  
  const baseFrequency = 440.0;
  
  // Fetch the Wasm module as raw bytes
  const res = await fetch("./wavetable.wasm");
  const moduleBytes = await res.arrayBuffer();

  // Send the Wasm module, waveform data, and wavetable settings over to the processor thread
  workletHandle.port.postMessage({
    arrayBuffer: moduleBytes,
    waveformsPerDimension,
    dimensionCount,
    wavformLength: waveformSampleCount,
    baseFrequency,
    tableSamples
  });


  workletHandle.connect(ctx.destination);

  createOscillator(ctx, workletHandle);
}();