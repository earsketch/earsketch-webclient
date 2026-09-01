---
base_model: laion/clap-htsat-unfused
library_name: transformers.js
tags:
- zero-shot-audio-classification
---

https://huggingface.co/laion/clap-htsat-unfused with ONNX weights to be compatible with Transformers.js.

## Usage (Transformers.js)

If you haven't already, you can install the [Transformers.js](https://huggingface.co/docs/transformers.js) JavaScript library from [NPM](https://www.npmjs.com/package/@xenova/transformers) using:
```bash
npm i @xenova/transformers
```

**Example:** Perform zero-shot audio classification with `Xenova/clap-htsat-unfused`.
```js
import { pipeline } from '@xenova/transformers';

const classifier = await pipeline('zero-shot-audio-classification', 'Xenova/clap-htsat-unfused');

const audio = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/dog_barking.wav';
const candidate_labels = ['dog', 'vaccum cleaner'];
const scores = await classifier(audio, candidate_labels);
// [
//   { score: 0.9993992447853088, label: 'dog' },
//   { score: 0.0006007603369653225, label: 'vaccum cleaner' }
// ]
```

**Example:** Compute text embeddings with `ClapTextModelWithProjection`.

```js
import { AutoTokenizer, ClapTextModelWithProjection } from '@xenova/transformers';

// Load tokenizer and text model
const tokenizer = await AutoTokenizer.from_pretrained('Xenova/clap-htsat-unfused');
const text_model = await ClapTextModelWithProjection.from_pretrained('Xenova/clap-htsat-unfused');

// Run tokenization
const texts = ['a sound of a cat', 'a sound of a dog'];
const text_inputs = tokenizer(texts, { padding: true, truncation: true });

// Compute embeddings
const { text_embeds } = await text_model(text_inputs);
// Tensor {
//   dims: [ 2, 512 ],
//   type: 'float32',
//   data: Float32Array(1024) [ ... ],
//   size: 1024
// }
```

**Example:** Compute audio embeddings with `ClapAudioModelWithProjection`.
```js
import { AutoProcessor, ClapAudioModelWithProjection, read_audio } from '@xenova/transformers';

// Load processor and audio model
const processor = await AutoProcessor.from_pretrained('Xenova/clap-htsat-unfused');
const audio_model = await ClapAudioModelWithProjection.from_pretrained('Xenova/clap-htsat-unfused');

// Read audio and run processor
const audio = await read_audio('https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/cat_meow.wav');
const audio_inputs = await processor(audio);

// Compute embeddings
const { audio_embeds } = await audio_model(audio_inputs);
// Tensor {
//   dims: [ 1, 512 ],
//   type: 'float32',
//   data: Float32Array(512) [ ... ],
//   size: 512
// }
```

---

Note: Having a separate repo for ONNX weights is intended to be a temporary solution until WebML gains more traction. If you would like to make your models web-ready, we recommend converting to ONNX using [🤗 Optimum](https://huggingface.co/docs/optimum/index) and structuring your repo like this one (with ONNX weights located in a subfolder named `onnx`).