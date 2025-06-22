const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND || "http://localhost:5001";

export interface BackendHealthResponse {
  status: string;
  service: string;
  timestamp: string;
}

export interface EncryptVideoResponse {
  mp4: string;
  mp4_filename: string;
}

export class BackendService {
  private static instance: BackendService;
  private healthCheckCache: { isHealthy: boolean; lastCheck: number } = {
    isHealthy: false,
    lastCheck: 0,
  };

  private constructor() {}

  static getInstance(): BackendService {
    if (!BackendService.instance) {
      BackendService.instance = new BackendService();
    }
    return BackendService.instance;
  }

  async checkHealth(): Promise<boolean> {
    const now = Date.now();
    const CACHE_DURATION = 30000; // 30 seconds

    // Return cached result if recent
    if (now - this.healthCheckCache.lastCheck < CACHE_DURATION) {
      return this.healthCheckCache.isHealthy;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${BACKEND_URL}/health`, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const isHealthy = response.ok;
      this.healthCheckCache = {
        isHealthy,
        lastCheck: now,
      };

      return isHealthy;
    } catch (error) {
      console.error("Backend health check failed:", error);
      this.healthCheckCache = {
        isHealthy: false,
        lastCheck: now,
      };
      return false;
    }
  }

  async encryptVideo(
    videoFile: File,
    text: string
  ): Promise<EncryptVideoResponse> {
    const formData = new FormData();
    formData.append("video", videoFile);
    formData.append("text", text);

    const response = await fetch(`${BACKEND_URL}/encrypt`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Encryption failed: ${response.statusText}`);
    }

    return await response.json();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async decryptVideo(videoFile: File): Promise<any> {
    const formData = new FormData();
    formData.append("video", videoFile);

    const response = await fetch(`${BACKEND_URL}/decrypt`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Decryption failed: ${response.statusText}`);
    }

    return await response.json();
  }
}

export const backendService = BackendService.getInstance();
