import config from "./config";

import { sineWave, triangleWave, squareWave, sawtoothWave } from "./wave-generators";
import { settingsUI } from "./event-handlers";
import { info, err } from "./util";

// @ts-ignore
import worklet from "./wave-table-node-processor.worklet";


function createOscillator(ctx: AudioContext, workletHandle: AudioWorkletNode) {
  // create an oscillator that outputs a 2hz triangle wave
  const oscillator = new OscillatorNode(ctx);
  oscillator.frequency.value = 2;
  oscillator.type = "triangle";
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
  // TODO: Why does Typescript think `AudioParamMap` does not have a get Parameter?
  // @ts-ignore
  const dimension0Mix = workletHandle.parameters.get("dimension_0_mix");
  oscillatorGain.connect(dimension0Mix);
}

async function init(): Promise<AudioContext> {
  const { sampleRate, desiredFrequency } = config;
  // Register our custom `AudioWorkletProcessor`, and create an `AudioWorkletNode` that serves as a
  // handle to an instance of one.
  const ctx = new AudioContext();

  // await ctx.audioWorklet.addModule("/wave-table-node-processor.js");
  // TODO: Get webpack to fill in this value
  // await ctx.audioWorklet.addModule("/processor.bundle.js");
  await ctx.audioWorklet.addModule(worklet);
  const workletHandle = new AudioWorkletNode(ctx, "wavetable-node-processor");

  settingsUI(ctx, workletHandle);

  // workletHandle.parameters.get('frequency').value = 516.41;
  // console.log(workletHandle.parameters.get('frequency'));

  const waveformSampleCount = sampleRate / desiredFrequency;

  // Using those waveforms we generated earlier, construct a flat array of the waveform samples
  // which which to fill the wave table
  const wavetableDef = [
    [
      sineWave(sampleRate, desiredFrequency),
      triangleWave(sampleRate, desiredFrequency),
    ],
    [
      squareWave(sampleRate, desiredFrequency),
      sawtoothWave(sampleRate, desiredFrequency),
    ],
  ];

  const dimensionCount = 2; // probably wavetableDef.length
  const waveformsPerDimension = 2; // probably wavetableDef[x].length

  const samplesPerDimension = waveformSampleCount * waveformsPerDimension;

  const tableSamples = new Float32Array(
    dimensionCount * waveformsPerDimension * waveformSampleCount
  );

  for (let dimensionIx = 0; dimensionIx < dimensionCount; dimensionIx += 1) {
    for (
      let waveformIx = 0;
      waveformIx < waveformsPerDimension;
      waveformIx += 1
    ) {
      for (let sampleIx = 0; sampleIx < waveformSampleCount; sampleIx += 1) {
        tableSamples[
          samplesPerDimension * dimensionIx +
            waveformSampleCount * waveformIx +
            sampleIx
        ] = wavetableDef[dimensionIx][waveformIx][sampleIx];
      }
    }
  }

  // FIXME: OG handles this differently, using base frequency (used to generate waveforms)
  // as the param to the worklet
  // const baseFrequency = 440.0;

  // Fetch the Wasm module as raw bytes
  const res = await fetch("./wavetable.wasm");
  const moduleBytes = await res.arrayBuffer();

  // Send the Wasm module, waveform data, and wavetable settings over to the processor thread
  workletHandle.port.postMessage({
    arrayBuffer: moduleBytes,
    waveformsPerDimension,
    dimensionCount,
    waveformLength: waveformSampleCount,
    // baseFrequency
    // FIXME: Rename
    baseFrequency: desiredFrequency,
    tableSamples,
  });

  workletHandle.connect(ctx.destination);

  return ctx;
}

// TODO: Remove global vars
let ready = false;
let playing = false;
let audioContext: AudioContext | null = null;

async function playHandler(e: Event) {
  
  try {
    if (!ready) {
      audioContext = await init();
      ready = true;
      info("Audio context ready...");
    }
  } catch (error) {
    err("Error trying to init audioContext", error);
    return;
  }

  if (!audioContext) {
    throw new Error("Whoops, something went very wrong");
  }

  const target = (e.target as HTMLButtonElement);

  try {
    if (!playing) {
      await audioContext.resume();
      info("Starting playing...");
      target.innerText = "Stop";
    } else {
      audioContext.suspend();
      info("Stop");
      target.innerText = "Play";
    }

    playing = !playing;
  } catch (error) {
    err("Error occurred attempting to control sound", error);
  }
}







function onLoadHandler(e: Event) {
  info("Hello world!");
  // TODO: Fix awkward union
  const button: HTMLElement | null = document.querySelector("#play-button");
  if (button) {
    button.onclick = playHandler;
  } 
}

window.onload = onLoadHandler;
