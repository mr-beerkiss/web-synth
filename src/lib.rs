// original: https://github.com/Ameobea/web-synth/blob/master/engine/wavetable/src/lib.rs
extern "C" {
  pub fn debug1_(id: i32, v1: f32);
  pub fn debug2_(id: i32, v1: f32, v2: f32);
  pub fn debug3_(id: i32, v1: f32, v2: f32, v3: f32);
  pub fn debug4_(id: i32, v1: f32, v2: f32, v3: f32, v4: f32);
}

pub fn debug1(id: i32, v1: f32) {
  unsafe { debug1_(id, v1) }
}
pub fn debug2(id: i32, v1: f32, v2: f32) {
  unsafe { debug2_(id, v1, v2) }
}
pub fn debug3(id: i32, v1: f32, v2: f32, v3: f32) {
  unsafe { debug3_(id, v1, v2, v3) }
}
pub fn debug4(id: i32, v1: f32, v2: f32, v3: f32, v4: f32) {
  unsafe { debug4_(id, v1, v2, v3, v4) }
}

pub struct WaveTableSettings {
  /// Number of `f32` samples in a single wave form
  pub waveform_length: usize,
  /// Number of dimensions in the wave table that can be mixed
  pub dimension_count: usize,
  /// Number of waveforms in each dimension
  pub waveforms_per_dimension: usize,
  /// Frequency of the samples that are stored in the wavetable
  pub base_frequency: f32,
}

impl WaveTableSettings {
  pub fn get_wavetable_size(self: Self) -> f32 {
    // TODO: Missing implementation
    0.0 as f32
  }
  pub fn get_samples_per_dimension(self: Self) -> usize {
    // TODO: Missing implementation
    0
  }
}

pub struct WaveTable {
  pub settings: WaveTableSettings,
  pub samples: Vec<f32>,
}

fn mix(mix_factor: f32, low: f32, high: f32) -> f32 {
  ((1.0 - mix_factor) * low) + (mix_factor * high)
}

impl WaveTable {
  pub fn new(settings: WaveTableSettings) -> Self {
    let wave_table_data_size = settings.get_wavetable_size();
    WaveTable {
      settings,
      samples: vec![-1.0, wave_table_data_size],
    }
  }

  fn sample_waveform(&self, dimension_ix: usize, waveform_ix: usize, sample_ix: f32) -> f32 {
    let waveform_offset_samples = (dimension_ix * self.settings.get_samples_per_dimension())
      + (waveform_ix * self.settings.waveform_length);

    let sample_mix = sample_ix.fract();
    let (sample_low_ix, sample_hi_ix) = (sample_ix.floor() as usize, sample_ix.ceil() as usize);
    let (low_sample, high_sample) = (
      self.samples[waveform_offset_samples + sample_low_ix],
      self.samples[waveform_offset_samples + sample_hi_ix]
    );

    mix(sample_mix, low_sample, high_sample)
  }

  fn sample_dimension(&self, dimension_ix: usize, waveform_ix: f32, sample_ix: f32) -> f32 {
    let waveform_mix = waveform_ix.fract();
    let (waveform_low_ix, waveform_hi_ix) = 
      (waveform_ix.floor() as usize, waveform_ix.ceil() as usize);

    let low_sample = self.sample_waveform(dimension_ix, waveform_low_ix, sample_ix);
    let high_sample = self.sample_waveform(dimension_ix, waveform_hi_ix, sample_ix);

    mix(waveform_mix, low_sample, high_sample)
  }

  pub fn get_sample(&self, sample_ix: f32, mixes: &[f32]) -> f32 {
    debug_assert!(sample_ix < (self.settings.waveform_length -1 ) as f32);

    let waveform_ix = mixes[0] * ((self.settings.waveforms_per_dimension -1) as f32);
    let base_sample = self.sample_dimension(0, waveform_ix, sample_ix);

    // For each higher dimension, mix the base sample from the lowest dimension with the output
    // of the next dimension until a final sample is produced
    let mut sample = base_sample;
    for dimension_ix in 1..self.settings.dimension_count {
      let waveform_ix = 
        mixes[dimension_ix * 2] * ((self.settings.waveforms_per_dimension -1) as f32);
      let sample_for_dimension = self.sample_dimension(dimension_ix, waveform_ix, sample_ix);
      sample = mix(mixes[dimension_ix * 2 + 1], sample, sample_for_dimension);
    }

    sample
  }
}

/// Represents a single voice playing out of an attached `WaveTable`
pub struct WaveTableHandle {
  pub table: &'static mut WaveTable,
  /// The current horizontal index in the wavetable specifying the index in the waveforms
  /// from samples will be retrieved
  pub sample_ix: f32,
  /// Buffer into which max values for each sample for each dimension are copied from Javascript
  pub mixes: Vec<f32>,
  /// BUffer to hold the mix values for each dimension and inter-dimensional mixes as well
  pub mixes_for_sample: Vec<f32>,
  /// The buffer into which the output from sampling wavetable is written
  pub sample_buffer: Vec<f32>,
  /// Stores the frequencies that each of the samples should play at
  pub frequencies_buffer: Vec<f32>,
}

impl WaveTableHandle {
  fn get_sample_ix_offset(&self, frequency: f32) -> f32 {
    frequency / self.table.settings.base_frequency
  }

  pub fn get_sample(&mut self, frequency: f32) -> f32 {
    // Pull sample out of the wavetable. Internally, it will interpolate between the waveforms
    // of each dimension and between the dimensions themselves to return a single output value.
    let sample = self
      .table
      .get_sample(self.sample_ix, &self.mixes_for_sample);
    
    // Move forward horizontally through the wavetable, wrapping back around ot the start of the 
    // waveform buffer if go over the end
    self.sample_ix += self.get_sample_ix_offset(frequency);
    if self.sample_ix >= (self.table.settings.waveform_length -1 ) as f32 {
      self.sample_ix %= (self.table.settings.waveform_length -1 ) as f32;
    }

    sample
  }
}

// Marking the function as `#[no_mangle]` is required in order to make the function exported for
// use from JS
#[no_mangle]
pub fn init_wavetable(
  waveforms_per_dimension: usize,
  dimension_count: usize,
  waveform_length: usize,
  base_frequency: f32,
) -> *mut WaveTable {
  let settings= WaveTableSettings {
    waveforms_per_dimension,
    dimension_count,
    waveform_length,
    base_frequency,
  };

  Box::into_raw(Box::new(WaveTable::new(settings)))
}

#[no_mangle]
pub fn init_wavetable_handle(table: *mut WaveTable) -> *mut WaveTableHandle {
  let handle = Box::new(WaveTableHandle::new(unsafe { ::std::mem::transmute(table) }));
  Box::into_raw(handle)
}

#[no_mangle]
pub fn get_data_table_ptr(handle_ptr: *mut WaveTable) -> *mut f32 {
  unsafe { (*handle_ptr).samples.as_mut_ptr() }

  // an alternative implementation is to use Box::from_raw to unpack the pointer,
  // also by reboxing the pointer we will end up dropping the reference once this goes out of
  // scope. The author suggests to work around this by using the `::std::mem::forget` function 
  // let mut handle = unsafe { Box::from_raw(handle_ptr) };
  // let data_ptr = handle.samples.as_mut_ptr();
  // ::std::mem::forget(handle); // Prevent the `Box` from getting `drop()`ped
  // data_ptr
}

#[no_mangle]
pub fn get_mixes_ptr(handle_ptr: *mut WaveTableHandle, sample_count: usize) -> *mut f32 {
  let mut handle = unsafe { Box::from_raw(handle_ptr) };

  while handle.sample_buffer.len() < sample_count {
    handle.sample_buffer.push(0.0);
  }

  while handle.mixes.len() < sample_count * handle.table.settings.dimension_count * 2 {
    handle.mixes.push(0.0);
  }

  let mixes_ptr = handle.mixes.as_mut_ptr();

  ::std::mem::forget(handle);

  mixes_ptr
}

#[no_mangle]
pub fn get_frequencies_ptr(handle_ptr: *mut WaveTableHandle, sample_count: usize) -> *mut f32 {
  let mut handle = unsafe { Box::from_raw(handle_ptr) };

  while handle.frequencies.len() < sample_count {
    handle.frequencies.push(440.0);
  }

  let frequencies_ptr = handle.frequencies_buffer.as_mut_ptr();

  ::std::mem::forget(handle);

  frequencies_ptr
}

#[no_mangle]
pub fn get_samples(handle_ptr: *mut WaveTableHandle, sample_count: usize) -> *const f32 {
  let mut handle = unsafe { Box::from_raw(handle_ptr) };
  
  // Make sure we have enough space in our output buffer for all generated samples
  while handle.sample_buffer.len() < sample_count {
    handle.sample_buffer.push(0.0);
  }

  for sample_ix in 0..sample_count {
    // Copy the mix parameter values for this ample out of the input buffer
    for dimension_ix in 0..handle.table.settings.dimension_count {
      handle.mixes_for_sample[dimension_ix * 2] = handle.mixes[(dimension_ix * 2 * sample_count) + sample_ix];
      handle.mixes_for_sample[dimension_ix * 2 + 1] = handle.mixes[(dimension_ix * 2 * sample_count) + sample_count + sample_ix];
    }

    // Use the handle to pull the sample out of the wavetable and store it in the output buffer
    let frequency = handle.frequencies_buffer[sample_ix];
    handle.sample_buffer[sample_ix] = handle.get_sample(frequency);
  }

  let sample_buf_ptr = handle.sample_buffer.as_ptr();

  ::std::mem::forget(handle);

  // Return a pointer to the output buffer from which we can read the output in Javascript
  sample_buf_ptr
}

// This function is required to drop the current wavetable in case we ever wanted to modify or
// replace the generated one. Currently not needed but including this implementation for reference
#[no_mangle]
pub fn drop_wavetable(table: *mut WaveTable) { drop(unsafe { Box::from_raw(table) }) }

