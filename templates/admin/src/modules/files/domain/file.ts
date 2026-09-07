export interface FileRecord {
  id: string;
  name: string;
  size: number;
}
export interface UploadPayload {
  bytes: ArrayBuffer;
  name: string;
}
export interface FileRepository {
  upload(file: UploadPayload): Promise<FileRecord>;
}
export function validateFile(file: { size: number; name: string }) {
  if (file.size > 5 * 1024 * 1024) return '文件不能超过 5 MB';
  if (file.size === 0) return '不能上传空文件';
  if (!file.name.trim()) return '文件名不能为空';
  return null;
}
