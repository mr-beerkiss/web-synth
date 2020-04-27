import { info, err } from "./util";



function freqControl(workletHandle: AudioWorkletNode) {
  const inputEl = document.querySelector("#freq-control");
  const valueLabel = document.querySelector("#freq-control-value");
  inputEl!.addEventListener("input", function (event) {
    const val = (event.target as HTMLInputElement).value;
    console.log(`Frequency: ${val}hz`);
    // TODO: Why does Typescript think `AudioParamMap` does not have a get Parameter?
    // @ts-ignore
    workletHandle.parameters.get("frequency").value = val;
    valueLabel!.textContent = `${val}hz`;
  });

  inputEl!.addEventListener("click", function (event) {
    info(
      `Frequency control released. New gain value = ${
        // TODO: Why does Typescript think `AudioParamMap` does not have a get Parameter?
        // @ts-ignore
        workletHandle.parameters.get("frequency").value
      }`
    );
  });
}

// FIXME: Gain control doesn't appear to be working
function gainControl(ctx: AudioContext) {
  // TODO: Why division by 150 (OG code)
  // globalGain.gain.value = 5/150;

  // TODO: MDN recommends not using `new GainNode()` directly, why?
  const gainNode = ctx.createGain();
  gainNode.connect(ctx.destination);

  // NOTE: `oninput` doesn't work on IE10
  const inputEl = document.querySelector("#gain-control");
  inputEl!.addEventListener("input", function (event) {
    const value = (event.target as HTMLInputElement).value;
    console.log(`New Gain: ${value}`);
    const numValue = parseInt(value, 10);
    gainNode.gain.setValueAtTime(numValue, ctx.currentTime);
  });

  inputEl!.addEventListener("click", function (event) {
    info(`Gain control released. New gain value = ${gainNode.gain.value}`);
  });
}

export function settingsUI(ctx: AudioContext, workletHandle: AudioWorkletNode) {
  gainControl(ctx);
  freqControl(workletHandle);

  // TODO: Toggle oscillator
  //createOscillator(ctx, workletHandle);
}