#!/usr/bin/env bash

# clean up
rm -fr dist/ 
rm -fr target/

mkdir -p ./dist/


# TODO: Is there no wasm64 target?
cargo build --target wasm32-unknown-unknown

# TODO: Optimisations
cp ./target/wasm32-unknown-unknown/debug/wavetable.wasm ./dist

# Copy Web files
cp ./web/* dist

pushd dist; python -m http.server

# Optimisations: according to the blog post, use `wasm-opt` to reduce the wasm file size
# TODO: Verify if it's -O4 ot 04
# wasm-opt dist/wavetable.wasm -O4 -o dist/wavetable.wasm

# Further optimization: `wasm-strip` to remove additional debugging symbols
# wasm-strip dist/wavetable.wasm

# TODO: Learn more about `twiggy` subcommands
# Use `twiggy top dist/wavetable.wasm` for a breakdown of wasm binary
