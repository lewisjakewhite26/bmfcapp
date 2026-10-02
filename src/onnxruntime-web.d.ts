// onnxruntime-web's package "exports" hide its types; they are onnxruntime-common's API.
declare module 'onnxruntime-web/wasm' {
  export * from 'onnxruntime-common'
}
