import Constants from "expo-constants";
import { Platform } from "react-native";

// NOTE: Supports cases where `content-type` is other than `json`
const getBody = <T>(c: Response | Request): Promise<T> => {
  const contentType = c.headers.get("content-type");

  if (contentType && contentType.includes("application/json")) {
    return c.json();
  }

  if (contentType && contentType.includes("application/pdf")) {
    return c.blob() as Promise<T>;
  }

  return c.text() as Promise<T>;
};

const getDevHostFromExpo = (): string | null => {
  const hostUri =
    (Constants as any).expoConfig?.hostUri ??
    (Constants as any).manifest?.hostUri ??
    (Constants as any).manifest2?.extra?.expoClient?.hostUri;

  if (!hostUri) {
    return null;
  }

  try {
    const parsed = new URL(hostUri.includes("://") ? hostUri : `http://${hostUri}`);
    return parsed.hostname || null;
  } catch {
    return null;
  }
};

const getDefaultBaseUrl = (): string => {
  const devHost = getDevHostFromExpo();
  if (devHost) {
    return `http://${devHost}:8080/api/v1`;
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:8080/api/v1";
  }

  return "http://localhost:8080/api/v1";
};

// NOTE: Update just base url
const getUrl = (contextUrl: string): string => {
  const url = new URL(contextUrl);
  let pathname = url.pathname;
  const search = url.search;

  // Use environment variable for API base URL
  // For iOS simulator, localhost won't work - use your machine's IP or the env variable
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || getDefaultBaseUrl();

  const isFetchDebug =
    __DEV__ && process.env.EXPO_PUBLIC_DEBUG_FETCH === "true";
  if (isFetchDebug) {
    console.log(
      "[customFetch] Environment variable EXPO_PUBLIC_API_BASE_URL:",
      process.env.EXPO_PUBLIC_API_BASE_URL,
    );
    console.log("[customFetch] Using baseUrl:", baseUrl);
    console.log("[customFetch] Original contextUrl:", contextUrl);
    console.log("[customFetch] Original pathname:", pathname);
  }

  // Remove leading /api/v1 if it exists in the pathname since baseUrl already includes it
  // This prevents duplication when the generated client already includes /api/v1
  if (pathname.startsWith("/api/v1")) {
    pathname = pathname.substring(7); // Remove /api/v1 prefix
    if (isFetchDebug) {
      console.log(
        "[customFetch] Removed /api/v1 prefix, new pathname:",
        pathname,
      );
    }
  }

  const requestUrl = new URL(`${baseUrl}${pathname}${search}`);
  if (isFetchDebug) {
    console.log("[customFetch] Final request URL:", requestUrl.toString());
  }

  return requestUrl.toString();
};

// NOTE: Add headers
const getHeaders = async (headers?: HeadersInit): Promise<HeadersInit> => {
  // Import supabase dynamically to avoid circular dependencies
  const { supabase } = await import('../supabase');

  // Get the current session to extract the access token
  const { data: { session } } = await supabase.auth.getSession();

  const authHeaders: HeadersInit = {};
  if (session?.access_token) {
    authHeaders['Authorization'] = `Bearer ${session.access_token}`;
  }

  return {
    ...(headers || {}),
    ...authHeaders,
  };
};

export const customFetch = async <T>(
  url: string,
  options: RequestInit,
): Promise<T> => {
  const startTime = Date.now();
  const requestUrl = getUrl(url);
  const requestHeaders = await getHeaders(options.headers);

  const requestInit: RequestInit = {
    ...options,
    headers: requestHeaders,
  };

  // Log the outgoing API call
  const method = options.method || 'GET';
  console.log(`[API Call] ${method} ${requestUrl}`);
  if (requestInit.body != null) {
    const body = requestInit.body;
    let payloadPreview: string;
    if (typeof body === 'string') {
      payloadPreview = body;
    } else if (body instanceof FormData) {
      payloadPreview = '[FormData]';
    } else if (body instanceof Blob) {
      payloadPreview = `[Blob size=${body.size}]`;
    } else if (body instanceof ArrayBuffer) {
      payloadPreview = `[ArrayBuffer byteLength=${body.byteLength}]`;
    } else {
      payloadPreview = `[Body type=${Object.prototype.toString.call(body)}]`;
    }
    console.log(`[API Payload] ${method} ${requestUrl} - Body:`, payloadPreview);
  }

  try {
    const response = await fetch(requestUrl, requestInit);
    const duration = Date.now() - startTime;
    if (response.status === 204 || response.status === 205) {
      console.log(
        `[API Response] ${method} ${requestUrl} - Status: ${response.status} - Duration: ${duration}ms`
      );
      return { status: response.status, data: undefined, headers: response.headers } as T;
    }

    const data = await getBody<T>(response);

    // Log the API response
    console.log(
      `[API Response] ${method} ${requestUrl} - Status: ${response.status} - Duration: ${duration}ms`
    );

    return { status: response.status, data, headers: response.headers } as T;
  } catch (error) {
    const duration = Date.now() - startTime;

    // Log API errors
    console.error(
      `[API Error] ${method} ${requestUrl} - Duration: ${duration}ms - Error:`,
      error
    );

    throw error;
  }
};
