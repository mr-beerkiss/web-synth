// Sine waves are just the sine function. The sine function naturally has a period of 2π, and we
// need to scale that into a period of (sample_rate / desired_frequency). So, the equation we use
// to generate the samples of our 30hz sine wave is y = sin(x * (2π / (44100 / 30))):
export function sineWave(sampleRate: number, frequency: number): Array<number> {
  const buf = [];

  const waveformSampleCount = sampleRate / frequency;

  for (let x = 0; x < waveformSampleCount; x += 1) {
    buf[x] = Math.sin(x * ((Math.PI * 2) / waveformSampleCount));
    // buf[x] = Math.sin((x * Math.PI * 2) / waveformSampleCount);
  }

  return buf;
}

// Triangle waves start at -1, spend half a period rising linearly to 1, and then half a period
// linearly falling back down to -1. I found that the easiest way to think about this one was to
// treat it as a repeating piecewise function with one piece on each half of the waveform
export function triangleWave(sampleRate: number, frequency: number): Array<number> {
  const buf = [];

  const waveformSampleCount = sampleRate / frequency;

  // triangle wave; goes from -1 to 1 for one half the period, and 1 to -1 the other half
  for (let x = 0; x < waveformSampleCount; x += 1) {
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

// Square waves are at -1 for half of a period, and then 1 for the other half
export function squareWave(sampleRate: number, frequency: number): Array<number> {
  const buf = [];

  const waveformSampleCount = sampleRate / frequency;

  for (let x = 0; x < waveformSampleCount; x += 1) {
    const halfPeriodIx = x / (waveformSampleCount / 2);
    const isFirstHalf = Math.floor(halfPeriodIx) % 2 == 0;

    buf[x] = isFirstHalf ? -1 : 1;
  }

  return buf;
}

// Sawtooth waves start at -1 and then rise linearly to 1 throughout the whole period, resetting
// back to -1 immediately at the beginning of the next period. It can be implemented rather easily
// by just repeating a scaled y = x function:
export function sawtoothWave(sampleRate: number, frequency: number): Array<number> {
  const buf = [];

  const waveformSampleCount = sampleRate / frequency;

  // sawtooth; climb from -1 to 1 over 1 period
  for (let x = 0; x < waveformSampleCount; x += 1) {
    // what fraction of the way we are through the current period
    const periodIxFract = (x / waveformSampleCount) % 1;

    // scale from [0, 1] to [-1, 1]
    buf[x] = periodIxFract * 2 - 1;
  }

  return buf;
}
