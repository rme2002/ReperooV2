# API

## Introduction

API is a FastAPI-based project that provides [brief description of your project].

## Prerequisites

Before you begin, ensure you have the following installed:

- Docker
- Python 3.13
- virtualenv (optional)

## Getting Started

1. **Clone the repository**

    ```bash
    git clone <your repo>
    cd <repo name>
    ```

2. **Create an .env file**

    Create a file named `.env` in the project root and add the following, replacing `[YOUR_API_KEY]` with your actual API key:

    ```env
    API_KEY=[YOUR_API_KEY]
    ```

## Running the container

6. **Build Docker image**

    ```bash
    docker build -t api:latest .
    ```

7. **Run Docker container**

    ```bash
    docker run --rm -p 8080:8080 --name api api:latest
    ```

## Usage

The API will be accessible at http://localhost:8080/api/v1. [Provide details on how to use your API, including endpoints and examples.]

## Development

[Include any additional information for developers, such as how to contribute, testing, etc.]

## Deploying to Google Cloud Platform (GCP)

To deploy on Cloud Run using Cloud Build, leverage the cloudbuild.yaml file. Additionally, securely store your secrets in Secret Manager, and incorporate them during the build phase. This strategy optimizes resource usage by avoiding additional costs associated with calling Secret Manager on startup (even though it's not entirely accurate, it aligns with the approach of minimizing costs when using scale to 0).

## Development

### Generate openapi models
```
uv run datamodel-codegen --input ../../packages/openapi/api.yaml --input-file-type openapi --output src/models/model.py --output-model-type pydantic_v2.BaseModel --target-python-version 3.13
```

### Linting
```
uv run ruff check # Lint files in the current directory.
uv run ruff check --fix # Lint files in the current directory and fix any fixable errors.
```