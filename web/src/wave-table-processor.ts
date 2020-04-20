interface AudioWorkletProcessor {
  readonly port: MessagePort;
  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Map<string, Float32Array>): void;
}

declare var AudioWorkletProcessor: {
  prototype: AudioWorkletProcessor;
  new(options?: AudioWorkletNodeOptions): AudioWorkletProcessor;
}


const data = {};
const debug = (id, ...args) => console.log(`[${id}]: ${args.join(" ")}`);
const importObject = {
  env: {
    debug1_: debug,
    debug2_: debug,
    debug3_: debug,
    debug4_: debug,
  },
};

// !async function() {
//   const compiledModule = await WebAssembly.compile(data.arrayBuffer);
//   const wasmInstance = await WebAssembly.instantiate(
//     compiledModule,
//     importObject
//   );
// }();

const MAX_DIMENSION_COUNT = 16;
const BYTES_PER_F32 = 32 / 8;

// TODO: Why is FRAME_SIZE = 128?
const FRAME_SIZE = 128;

// const SAMPLE_RATE = 44100;

// const desiredFrequency = 30;  // 30hz

// const waveformSampleCount = SAMPLE_RATE / desiredFrequency;

// TODO: Missing implementation
function clamp(min, max, value) {
  if (value < min) 
    return min;
  else if (value > max)
    return max;
  
  return value;
}

type WasmPointer = number;
type WasmMemoryOffset = number;

class WaveTableNodeProcessor extends AudioWorkletProcessor {

  dimensionCount: number
  wasmInstance: WebAssembly.Instance
  float32WasmMemory: Float32Array
  wavetablePtr: WasmPointer
  wavetableHandlePtr: WasmPointer
  mixesArrayOffset: WasmMemoryOffset

  constructor() {
    super();

    // TODO: Why does `this.port` have a squiggly line?
    this.port.onmessage = (event) => this.initWasmInstance(event.data);
  }

  async initWasmInstance(data) {
    this.dimensionCount = data.dimensionCount;

    const compiledModule = await WebAssembly.compile(data.arrayBuffer);
    this.wasmInstance = await WebAssembly.instantiate(
      compiledModule,
      importObject
    );

    // Call the Rust function exported from the Wasm module to create a wavetable instance with
    // the settings provided from the main thread.
    this.wavetablePtr = this.wasmInstance.exports.init_wavetable(
      data.waveformsPerDimension,
      data.dimensionCount,
      data.waveformLength,
      data.baseFrequency
    );

    // Wasm memory doesn't become available until after some function in the Wasm module has
    // been called, apparently, so we wait to set this reference until after calling one of
    // the Wasm functions
    this.float32WasmMemory = new Float32Array(
      this.wasmInstance.exports.memory.buffer
    );

    // Grab the pointer to the buffer where the wavetable's waveforms' data will be stored
    const wavetableDataPtr = this.wasmInstance.exports.get_data_table_ptr(
      this.wavetablePtr
    );

    const wavetableDataArrayOffset = wavetableDataPtr / BYTES_PER_F32;
    if (wavetableDataPtr % 4 !== 0) {
      throw new Error("Wavetable data array pointer is not 32-bit aligned");
    }

    // We set a marker value into the data table on the Wasm side; we check that it matches here
    // to ensure that we've got the correct pointer;
    if (this.float32WasmMemory[wavetableDataArrayOffset] !== -1) {
      throw new Error(
        "Marker value not set at initial wavetable sample data table pointer retrieved from Wasm"
      );
    }

    // Write the table's data into the Wasm heap
    this.float32WasmMemory.set(data.tableSamples, wavetableDataArrayOffset);

    // Create a handle to the wavetable that we can use to sample it
    this.wavetableHandlePtr = this.wasmInstance.exports.init_wavetable_handle(
      this.wavetablePtr
    );

    // Grab a pointer to the buffer in which we'll store the mix parameters for the different
    // dimensions
    const mixesPtr = this.wasmInstance.exports.get_mixes_ptr(
      this.wavetableHandlePtr,
      FRAME_SIZE
    );
    if (mixesPtr % 4 !== 0) {
      throw new Error("Mixes array point isn't 4-byte aligned");
    }
    this.mixesArrayOffset = mixesPtr / BYTES_PER_F32;

    // const f32WasmMemoryView = new Float32Array(
    //   this.wasmInstance.exports.memory.buffer
    // );
    // const f32WasmMemoryBufferIx = wavetableDataPtr / BYTES_PER_F32;

    // // TODO: Where is `wavetableData` defined?
    // f32WasmMemoryView.set(wavetableData, f32WasmMemoryBufferIx);
  }

  process(_inputs, outputs, params) {
    // Since the Wasm module and wavetable are all asynchronously loaded, we need to wait until
    // after they're available to start outputting audio. Until then, we just output silence
    if (!this.wavetableHandlePtr) {
      return true;
    }

    // TODO: Remove this comment  ... sample wavetable, writes samples to output. We'll get to that in a bit.

    // Write the nixes for each sample in the frame into the Wasm memory. Mixes are a flattened 3D
    // array of the form `mixes[dimensionIx][interOrIntraIndex][sampleIx]`
    for (
      let dimensionIx = 0;
      dimensionIx < this.dimensionCount;
      dimensionIx += 1
    ) {
      const intraDimensionalMixVals = params[`dimension_${dimensionIx}_mix`]; 
      const interDimensionalMixVals =
        dimensionIx > 0
          ? params[`dimesion_${dimensionIx - 1}x${dimensionIx}_mix`]
          : null;

      for (let sampleIx = 0; sampleIx < FRAME_SIZE; sampleIx += 1) {
        // We're not guaranteeing to have a unique value for each of the `AudioParams` for every
        // sample in the frame; if the value didn't change, we could have as few as one value. In
        // the case that we have less `AudioParam` values that samples, we re-use the last value.
        const intraVal =
          intraDimensionalMixVals[
            Math.min(sampleIx, intraDimensionalMixVals.length - 1)
          ];

        // Handle the case of the first dimension, which doesn't have any inter-dimensional mix
        const interVal = interDimensionalMixVals
          ? interDimensionalMixVals[
              Math.min(sampleIx, interDimensionalMixVals.length - 1)
            ]
          : 0;

        const dstIntraValIx = this.mixesArrayOffset + dimensionIx * FRAME_SIZE * 2 + sampleIx;
        const dstInterValIx = dstIntraValIx + FRAME_SIZE;

        // Apparently the `minValue` and `maxValue` params don't work, so we have to clamp manually
        // to [0, 1]
        this.float32WasmMemory[dstIntraValIx] = clamp(0, 1, intraVal);
        this.float32WasmMemory[dstInterValIx] = clamp(0, 1, interVal);
      }
    }

    // Write the frequencies for each sample into Wasm memory
    const frequencyBufPtr = this.wasmInstance.exports.get_frequencies_ptr(
      this.wavetableHandlePtr,
      FRAME_SIZE
    );

    if (frequencyBufPtr % 4 !== 0) {
      throw new Error("Frequency buffer isn't 4-byte aligned");
    }

    const frequencyBufArrayOffset = frequencyBufPtr / BYTES_PER_F32;
    
    if (params.frequency.length === 1) {
      for (let i=0; i < FRAME_SIZE; i+= 1) {
        this.float32WasmMemory[frequencyBufArrayOffset + i] = params.frequency[0];
      }
    } else {
      this.float32WasmMemory.set(params.frequency, frequencyBufArrayOffset);
    }

    // TODO: Determine if this is in the write place
    const generatedSamplesPtr = this.wasmInstance.exports.get_samples(
      this.wavetableHandlePtr,
      FRAME_SIZE
    );

    if (generatedSamplesPtr % 4 !== 0) {
      throw new Error("Generated samples pointer isn't 4-byte aligned");
    } 

    const generatedSamplesArrayOffset = generatedSamplesPtr / BYTES_PER_F32;

    // copy the generated samples out of Wasm memory into all the output buffers
    for (let outputIx = 0; outputIx < outputs.length; outputIx += 1 ) {
      for (let channelIx = 0; channelIx < outputs[outputIx].length; channelIx += 1) {
        for (let sampleIx = 0; sampleIx < FRAME_SIZE; sampleIx += 1) {
          const sample = this.float32WasmMemory[
            generatedSamplesArrayOffset + sampleIx
          ];
          outputs[outputIx][channelIx][sampleIx] = sample;
        }
      }
    }

    // Returning `true` from `process()` indicates that we have more data to process
    // and this function should keep getting called
    return true;
  }

  static get parameterDescriptors() {
    return [
      {
        name: "frequency",
        defaultValue: 440,
        automationRate: "a-rate",
      },
      ...Array(MAX_DIMENSION_COUNT)
        .fill(null)
        .map((_, i) => ({
          name: `dimension_${i}_mix`,
          defaultValue: 0.0,
          minValue: 0.0,
          maxValue: 1.0,
          automationRate: "a-rate",
        })),
      ...Array(MAX_DIMENSION_COUNT - 1)
        .fill(null)
        .map((_, i) => ({
          name: `dimension_${i}x${i + 1}_mix`,
          defaultValue: 0.0,
          minValue: 0.0,
          maxValue: 1.0,
          automationRate: "a-rate",
        })),
    ];
  }
}

registerProcessor("wavetable-node-processor", WaveTableNodeProcessor);