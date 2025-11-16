import { defineConfig } from 'orval';

export default defineConfig({
  'api-file': {
    input: '../../packages/openapi/api.yaml',
    output: {
      baseUrl: 'http://example.com', // dont change this. customFetch overrides this
      mode: 'tags-split',
      target: './lib/gen/api.ts',
      schemas: './lib/gen/model',
      client: 'fetch',
      override: {
        mutator: {
          path: './lib/gen/customFetch.ts',
          name: 'customFetch',
        },
      },
    } 
  },
});