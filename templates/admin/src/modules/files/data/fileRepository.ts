import { uploadFile } from '../../../api/generated/client';
import type { FileRepository } from '../domain/file';
export const fileRepository: FileRepository = {
  async upload(file) {
    const body = new FormData();
    body.append('file', new Blob([file.bytes]), file.name);
    return { ...(await uploadFile({ body })) };
  },
};
