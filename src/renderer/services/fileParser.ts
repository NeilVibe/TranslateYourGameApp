import * as XLSX from 'xlsx';
import * as xml2js from 'xml2js';
import * as gettextParser from 'gettext-parser';

export interface ParsedEntry {
  source: string;
  target?: string;
  metadata?: {
    id?: string;
    context?: string;
    row?: number;
    column?: string;
    [key: string]: any;
  };
}

export interface ParseResult {
  entries: ParsedEntry[];
  format: string;
  sourceColumn?: string;
  targetColumn?: string;
  metadata?: any;
}

class FileParser {
  async parseFile(fileInfo: { name: string; extension: string; content: Buffer }): Promise<ParseResult> {
    const extension = fileInfo.extension.toLowerCase();
    
    switch (extension) {
      case '.xlsx':
      case '.xls':
      case '.csv':
        return this.parseExcel(fileInfo.content, extension);
      case '.json':
        return this.parseJSON(fileInfo.content);
      case '.xml':
        return this.parseXML(fileInfo.content);
      case '.po':
      case '.pot':
        return this.parseGettext(fileInfo.content);
      default:
        throw new Error(`Unsupported file format: ${extension}`);
    }
  }

  private async parseExcel(content: Buffer, extension: string): Promise<ParseResult> {
    const workbook = XLSX.read(content, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (data.length === 0) {
      throw new Error('Excel file is empty');
    }

    // Simple no-header mode - always use columns 0 and 1
    const sourceColumn = 0;
    const targetColumn = 1;
    const headers = data[0] as string[];

    const entries: ParsedEntry[] = [];
    
    // Start from row 0 - no header skipping
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row[sourceColumn]) {
        entries.push({
          source: String(row[sourceColumn]).trim(),
          target: row[targetColumn] ? String(row[targetColumn]).trim() : undefined,
          metadata: {
            row: i + 1,
            sourceColumn: headers[sourceColumn] || 'A',
            targetColumn: headers[targetColumn] || 'B'
          }
        });
      }
    }

    return {
      entries,
      format: extension === '.csv' ? 'csv' : 'excel',
      sourceColumn: headers[sourceColumn] || 'Column A',
      targetColumn: headers[targetColumn] || 'Column B',
      metadata: {
        sheetName,
        totalRows: data.length,
        headers
      }
    };
  }

  private async parseJSON(content: Buffer): Promise<ParseResult> {
    const text = content.toString('utf8');
    const data = JSON.parse(text);
    const entries: ParsedEntry[] = [];

    // Handle different JSON structures
    if (Array.isArray(data)) {
      // Array of objects
      data.forEach((item, index) => {
        if (typeof item === 'string') {
          entries.push({ source: item, metadata: { index } });
        } else if (item.text || item.source || item.value) {
          entries.push({
            source: item.text || item.source || item.value,
            target: item.translation || item.target,
            metadata: { ...item, index }
          });
        }
      });
    } else if (typeof data === 'object') {
      // Key-value pairs
      Object.entries(data).forEach(([key, value]) => {
        if (typeof value === 'string') {
          entries.push({
            source: value,
            metadata: { id: key }
          });
        } else if (typeof value === 'object' && value !== null) {
          const obj = value as any;
          if (obj.text || obj.source || obj.value) {
            entries.push({
              source: obj.text || obj.source || obj.value,
              target: obj.translation || obj.target,
              metadata: { id: key, ...obj }
            });
          }
        }
      });
    }

    return {
      entries,
      format: 'json',
      metadata: {
        structure: Array.isArray(data) ? 'array' : 'object'
      }
    };
  }

  private async parseXML(content: Buffer): Promise<ParseResult> {
    const text = content.toString('utf8');
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(text);
    const entries: ParsedEntry[] = [];

    // Android strings.xml format
    if (result.resources && result.resources.string) {
      result.resources.string.forEach((item: any) => {
        entries.push({
          source: item._ || item,
          metadata: {
            id: item.$.name,
            translatable: item.$.translatable !== 'false'
          }
        });
      });
    } 
    // Generic XML - find all text nodes
    else {
      this.extractTextFromXML(result, entries);
    }

    return {
      entries,
      format: 'xml',
      metadata: {
        rootElement: Object.keys(result)[0]
      }
    };
  }

  private extractTextFromXML(obj: any, entries: ParsedEntry[], path: string = '') {
    if (typeof obj === 'string' && obj.trim()) {
      entries.push({
        source: obj.trim(),
        metadata: { path }
      });
    } else if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        this.extractTextFromXML(item, entries, `${path}[${index}]`);
      });
    } else if (typeof obj === 'object' && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        if (key !== '$') { // Skip attributes
          this.extractTextFromXML(value, entries, path ? `${path}.${key}` : key);
        }
      });
    }
  }

  private async parseGettext(content: Buffer): Promise<ParseResult> {
    const po = gettextParser.po.parse(content);
    const entries: ParsedEntry[] = [];

    // Extract translations from all contexts
    Object.values(po.translations as Record<string, any>).forEach((context: any) => {
      Object.values(context as Record<string, any>).forEach((translation: any) => {
        if (translation.msgid) {
          entries.push({
            source: translation.msgid,
            target: translation.msgstr ? translation.msgstr[0] : undefined,
            metadata: {
              context: translation.msgctxt,
              comments: translation.comments,
              flags: translation.flags
            }
          });
        }
      });
    });

    return {
      entries,
      format: 'gettext',
      metadata: {
        language: po.headers?.Language,
        charset: po.charset
      }
    };
  }

  // Reconstruct file with translations
  async reconstructFile(
    originalFile: { name: string; extension: string; content: Buffer },
    parseResult: ParseResult,
    translations: Array<{ source: string; translation: string }>
  ): Promise<Buffer> {
    const extension = originalFile.extension.toLowerCase();
    
    // Create translation map
    const translationMap = new Map<string, string>();
    translations.forEach(t => {
      translationMap.set(t.source, t.translation);
    });

    switch (extension) {
      case '.xlsx':
      case '.xls':
      case '.csv':
        return this.reconstructExcel(originalFile.content, parseResult, translationMap, extension);
      case '.json':
        return this.reconstructJSON(originalFile.content, parseResult, translationMap);
      case '.xml':
        return this.reconstructXML(originalFile.content, parseResult, translationMap);
      case '.po':
      case '.pot':
        return this.reconstructGettext(originalFile.content, translationMap);
      default:
        throw new Error(`Cannot reconstruct file format: ${extension}`);
    }
  }

  private reconstructExcel(
    content: Buffer, 
    parseResult: ParseResult, 
    translations: Map<string, string>,
    extension: string
  ): Buffer {
    const workbook = XLSX.read(content, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    // Update translations
    parseResult.entries.forEach(entry => {
      const translation = translations.get(entry.source);
      if (translation && entry.metadata?.row) {
        const rowIndex = entry.metadata.row - 1;
        const targetColumn = parseResult.targetColumn ? 
          data[0].indexOf(parseResult.targetColumn) : 1;
        
        if (data[rowIndex]) {
          data[rowIndex][targetColumn] = translation;
        }
      }
    });

    // Create new worksheet
    const newWorksheet = XLSX.utils.aoa_to_sheet(data);
    workbook.Sheets[sheetName] = newWorksheet;
    
    return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: extension === '.csv' ? 'csv' : 'xlsx' }));
  }

  private reconstructJSON(
    content: Buffer,
    parseResult: ParseResult,
    translations: Map<string, string>
  ): Buffer {
    const text = content.toString('utf8');
    const data = JSON.parse(text);
    
    if (Array.isArray(data)) {
      parseResult.entries.forEach(entry => {
        const translation = translations.get(entry.source);
        if (translation && typeof entry.metadata?.index === 'number') {
          if (typeof data[entry.metadata.index] === 'string') {
            data[entry.metadata.index] = translation;
          } else if (data[entry.metadata.index]) {
            if (data[entry.metadata.index].text) data[entry.metadata.index].text = translation;
            if (data[entry.metadata.index].source) data[entry.metadata.index].source = translation;
            if (data[entry.metadata.index].value) data[entry.metadata.index].value = translation;
            if (data[entry.metadata.index].translation) data[entry.metadata.index].translation = translation;
            if (data[entry.metadata.index].target) data[entry.metadata.index].target = translation;
          }
        }
      });
    } else {
      parseResult.entries.forEach(entry => {
        const translation = translations.get(entry.source);
        if (translation && entry.metadata?.id) {
          if (typeof data[entry.metadata.id] === 'string') {
            data[entry.metadata.id] = translation;
          } else if (data[entry.metadata.id]) {
            if (data[entry.metadata.id].text) data[entry.metadata.id].text = translation;
            if (data[entry.metadata.id].source) data[entry.metadata.id].source = translation;
            if (data[entry.metadata.id].value) data[entry.metadata.id].value = translation;
            if (data[entry.metadata.id].translation) data[entry.metadata.id].translation = translation;
            if (data[entry.metadata.id].target) data[entry.metadata.id].target = translation;
          }
        }
      });
    }
    
    return Buffer.from(JSON.stringify(data, null, 2));
  }

  private reconstructXML(
    content: Buffer,
    parseResult: ParseResult,
    translations: Map<string, string>
  ): Buffer {
    let text = content.toString('utf8');
    
    // Simple string replacement for Android strings.xml
    parseResult.entries.forEach(entry => {
      const translation = translations.get(entry.source);
      if (translation && entry.metadata?.id) {
        const regex = new RegExp(
          `(<string[^>]*name="${entry.metadata.id}"[^>]*>)([^<]*)(<\/string>)`,
          'g'
        );
        text = text.replace(regex, `$1${this.escapeXML(translation)}$3`);
      }
    });
    
    return Buffer.from(text);
  }

  private reconstructGettext(
    content: Buffer,
    translations: Map<string, string>
  ): Buffer {
    const po = gettextParser.po.parse(content);
    
    // Update translations
    Object.keys(po.translations).forEach(context => {
      Object.keys(po.translations[context]).forEach(msgid => {
        const translation = translations.get(msgid);
        if (translation && po.translations[context][msgid]) {
          po.translations[context][msgid].msgstr = [translation];
        }
      });
    });
    
    return gettextParser.po.compile(po);
  }

  private escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export default new FileParser();