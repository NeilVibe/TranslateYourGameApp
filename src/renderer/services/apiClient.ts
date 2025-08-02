import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = 'http://localhost:5002/api/v1';

export interface TranslateRequest {
  text: string;
  source_lang: string;
  target_lang: string;
  glossary_ids?: number[];
}

export interface TranslateBatchRequest {
  texts: string[];
  source_lang: string;
  target_lang: string;
  glossary_ids?: number[];
}

export interface FileTranslateRequest {
  file_entries: Array<{
    source: string;
    metadata?: any;
  }>;
  source_lang: string;
  target_lang: string;
  glossary_ids?: number[];
}

export interface TaskResponse {
  task_id: string;
  status: string;
  progress: number;
  items_completed?: number;
  total_items?: number;
  current_phase?: string;
  result_data?: any;
  error_message?: string;
  started_at?: number;
  current_item?: string;
  processing_time?: number;
  estimated_remaining?: number;
  status_message?: string;
}

class APIClient {
  private client: AxiosInstance;
  private apiKey: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add API key
    this.client.interceptors.request.use((config) => {
      if (this.apiKey) {
        config.headers['X-API-Key'] = this.apiKey;
      }
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized
          throw new Error('Invalid API key. Please check your settings.');
        }
        if (error.response?.status === 429) {
          // Handle rate limit
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        throw error;
      }
    );
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Health check
  async checkHealth() {
    const response = await this.client.get('/health');
    return response.data;
  }

  // Single text translation
  async translateText(request: TranslateRequest, timeout?: number) {
    const config = timeout ? { timeout } : {};
    const response = await this.client.post('/translate', request, config);
    return response.data;
  }

  // Single text translation (alias for ChatbotTranslation component)
  async translateSingle(request: TranslateRequest, timeout?: number) {
    return this.translateText(request, timeout);
  }

  // Batch translation
  async translateBatch(request: TranslateBatchRequest) {
    const response = await this.client.post('/translate/batch', request);
    return response.data;
  }

  // File translation (async task)
  async translateFile(request: FileTranslateRequest) {
    const response = await this.client.post('/tasks/translate-file', request);
    return response.data;
  }

  // Unified file translation endpoint (matches glossary upload pattern)
  async translateFileImmediate(file: File, sourceLang: string, targetLang: string, translationMode: 'simple' | 'smart' = 'simple', useGlossaries: boolean = false, glossaryIds: number[] = []) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source_lang', sourceLang);
    formData.append('target_lang', targetLang);
    formData.append('translation_mode', translationMode);
    formData.append('use_glossaries', useGlossaries.toString());
    glossaryIds.forEach(id => formData.append('glossary_ids[]', id.toString()));

    const response = await this.client.post('/file-translation/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // File upload and translation (real file upload with glossary mode support)
  async uploadAndTranslateFile(file: File, sourceLang: string, targetLang: string, glossaryIds: number[] = [], glossaryMode: string = 'existing') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source_lang', sourceLang);
    formData.append('target_lang', targetLang);
    formData.append('glossary_mode', glossaryMode); // none/existing/dynamic/both
    glossaryIds.forEach(id => formData.append('glossary_ids[]', id.toString()));

    const response = await this.client.post('/tasks/upload-file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Parse file only - do not start translation
  async parseFileOnly(file: File, sourceLang: string, targetLang: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source_lang', sourceLang);
    formData.append('target_lang', targetLang);
    formData.append('parse_only', 'true'); // Flag to only parse, not translate

    const response = await this.client.post('/tasks/parse-file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Start translation from parsed file with current settings
  async startTranslationFromParsedFile(parsedTaskId: string | undefined, sourceLang: string, targetLang: string, translationMode: 'simple' | 'smart' = 'simple', useGlossaries: boolean = false, glossaryIds: number[] = []) {
    const response = await this.client.post('/tasks/start-translation', {
      parsed_task_id: parsedTaskId,
      source_lang: sourceLang,
      target_lang: targetLang,
      translation_mode: translationMode,
      use_glossaries: useGlossaries,
      glossary_ids: glossaryIds
    });
    return response.data;
  }

  // Get task status
  async getTaskStatus(taskId: string): Promise<TaskResponse> {
    const response = await this.client.get(`/tasks/${taskId}`);
    return response.data.data;
  }

  // Get task result
  async getTaskResult(taskId: string) {
    const response = await this.client.get(`/tasks/${taskId}/result`);
    return response.data;
  }

  // Download completed translation file in original format
  async downloadTranslationFile(taskId: string, filename?: string) {
    const response = await this.client.get(`/tasks/${taskId}/download`, {
      responseType: 'blob'
    });
    
    // Create a download URL and trigger download
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Extract filename from response headers or use provided filename
    const contentDisposition = response.headers['content-disposition'];
    let downloadFilename = filename || 'translated_file.xlsx';
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        downloadFilename = filenameMatch[1].replace(/['"]/g, '');
      }
    }
    
    link.setAttribute('download', downloadFilename);
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    return { success: true, filename: downloadFilename };
  }

  // Glossary operations
  async getGlossaries() {
    const response = await this.client.get('/glossaries');
    return response.data;
  }

  async createGlossary(data: any) {
    const response = await this.client.post('/glossaries', data);
    return response.data;
  }

  async updateGlossary(id: number, data: any) {
    const response = await this.client.put(`/glossaries/${id}`, data);
    return response.data;
  }

  async deleteGlossary(id: number) {
    const response = await this.client.delete(`/glossaries/${id}`);
    return response.data;
  }

  async getGlossaryEntries(id: number, options?: {search?: string, searchType?: 'contains' | 'exact', page?: number, perPage?: number, includeLineEntries?: boolean}) {
    const params = new URLSearchParams();
    if (options?.search) params.append('search', options.search);
    if (options?.searchType) params.append('search_type', options.searchType);
    if (options?.page) params.append('page', options.page.toString());
    if (options?.perPage) params.append('per_page', options.perPage.toString());
    if (options?.includeLineEntries !== undefined) params.append('include_line_entries', options.includeLineEntries.toString());
    
    const url = `/glossaries/${id}/entries${params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.client.get(url);
    return response.data;
  }

  async addGlossaryEntry(id: number, data: any) {
    // API expects {entries: [{source_text, target_text}]}
    const response = await this.client.post(`/glossaries/${id}/entries`, {
      entries: [data]
    });
    return response.data;
  }

  async addGlossaryEntries(id: number, entries: Array<{source_text: string, target_text: string}>) {
    // API expects {entries: [{source_text, target_text}]}
    const response = await this.client.post(`/glossaries/${id}/entries`, {
      entries: entries
    });
    return response.data;
  }

  async updateGlossaryEntry(glossaryId: number, entryId: number, data: any) {
    const response = await this.client.put(`/glossaries/${glossaryId}/entries/${entryId}`, data);
    return response.data;
  }

  async deleteGlossaryEntry(glossaryId: number, entryId: number) {
    const response = await this.client.delete(`/glossaries/${glossaryId}/entries/${entryId}`);
    return response.data;
  }

  async embeddingSearchGlossary(glossaryId: number, searchText: string, topK: number = 10) {
    const response = await this.client.post(`/glossaries/${glossaryId}/embedding-search`, {
      text: searchText,
      top_k: topK
    });
    return response.data;
  }

  async generateDynamicGlossary(fileEntries: Array<{source: string}>, sourceLanguage: string, targetLanguage: string, glossaryIds: number[] = []) {
    const response = await this.client.post('/tasks/generate-glossary', {
      file_entries: fileEntries,
      source_lang: sourceLanguage,
      target_lang: targetLanguage,
      glossary_ids: glossaryIds
    });
    return response.data;
  }

  // Get supported languages
  async getLanguages() {
    const response = await this.client.get('/languages');
    return response.data;
  }

  // Get user info
  async getUserInfo() {
    const response = await this.client.get('/auth/user-info');
    return response.data;
  }

  // Get token balance
  async getTokenBalance() {
    const response = await this.client.get('/auth/token-balance');
    return response.data;
  }


  // Update profile
  async updateProfile(data: { username?: string; email?: string; company?: string }) {
    const response = await this.client.put('/auth/update-profile', data);
    return response.data;
  }

  // Get API usage statistics
  async getApiUsage(options?: { startDate?: string; endDate?: string; groupBy?: string }) {
    const params = new URLSearchParams();
    if (options?.startDate) params.append('start_date', options.startDate);
    if (options?.endDate) params.append('end_date', options.endDate);
    if (options?.groupBy) params.append('group_by', options.groupBy);
    
    const url = `/auth/api-usage${params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.client.get(url);
    return response.data;
  }

  // Task management methods
  async getActiveTasks() {
    const response = await this.client.get('/tasks/active');
    return response.data;
  }

  async getTaskHistory(limit?: number) {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    
    const url = `/tasks/history${params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.client.get(url);
    return response.data;
  }

  async cleanFinishedTasks() {
    const response = await this.client.delete('/tasks/clean-finished');
    return response.data;
  }

  async cancelTask(taskId: string) {
    const response = await this.client.post(`/tasks/${taskId}/cancel`);
    return response.data;
  }
}

export default new APIClient();