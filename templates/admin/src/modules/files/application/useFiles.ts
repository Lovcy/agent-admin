import { ref, type InjectionKey } from 'vue';
import { validateFile, type FileRecord, type FileRepository } from '../domain/file';
export const fileRepositoryKey: InjectionKey<FileRepository> = Symbol('FileRepository');
export function useFiles(repository: FileRepository) {
  const files = ref<FileRecord[]>([]);
  const uploading = ref(false);
  const error = ref('');
  async function upload(file: File) {
    error.value = validateFile(file) ?? '';
    if (error.value) return;
    uploading.value = true;
    try {
      files.value.unshift(
        await repository.upload({ bytes: await file.arrayBuffer(), name: file.name }),
      );
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : '上传失败';
    } finally {
      uploading.value = false;
    }
  }
  return { files, uploading, error, upload };
}
