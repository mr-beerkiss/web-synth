# My Web Synth

Still a long way to go but it works

## TODO

- [x] Convert JS to Typescript
- [ ] Create UI controls for Synth
- [ ] Create visual image representation of how it's working
- [ ] WTF is FM synthesis
- [ ] Incorporate FreeVerb

## CREDITS

Heavily influenced by this blog post: https://cprimozic.net/blog/buliding-a-wavetable-synthesizer-with-rust-wasm-and-webaudio/#overview.

In fact all the meaningful code is a direct rip off. It's been a very valuable starting point for me on this journey!

### Code

- [Demo](https://github.com/Ameobea/homepage/tree/master/src/components/WavetableDemo)
- [Rust Wavetable Synth](https://github.com/Ameobea/web-synth/blob/master/engine/wavetable/src/lib.rs)
- [WaveProcessor.js](https://notes.ameo.design/WaveTableNodeProcessor.js)


## NOTES

Struggling to get [worklet-loader](https://github.com/reklawnos/worklet-loader) working correctly. [SO answer](https://stackoverflow.com/questions/53794127/how-to-make-audioworklets-work-with-vue-cli-webpack-babel-getting-illegal-invo) seems sensible but I still get an error saying my worklet is "not a module." Also seems like `ts-loader` isn't working correctly 
for the worklet. The SO article provides a [demo implementation](https://github.com/montag/vue-audioworklet-demo) in Vue but since it lacks typescript it's hard to tell how to adapt it to my situation. 

Also note Typescript doesn't provide type definition for [AudioWorkletProcessor](https://github.com/microsoft/TypeScript/issues/28308) so I've had to provide custom ones.
