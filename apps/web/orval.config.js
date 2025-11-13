import { defineConfig } from 'orval';

export default defineConfig({
  'api-file': {
    input: '../../packages/openapi/api.yaml',
    output: {
      baseUrl: 'http://example.com', // dont change this. customFetch overrides this
      mode: 'tags-split',
      target: './app/gen/api.ts',
      schemas: './app/gen/model',
      client: 'fetch',
      override: {
        mutator: {
          path: './app/gen/customFetch.ts',
          name: 'customFetch',
        },
      },
    } 
  },
});