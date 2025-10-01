import { forEachFile } from 'src/features/plugin/file/utils/fore-each-file';
import { JsonValueStore } from '@revisium/schema-toolkit/model';

export const validateFileIdUniqueness = (
  fileId: string,
  valueStore: JsonValueStore,
) => {
  const fileIds: string[] = [];

  forEachFile(valueStore, (item) => {
    if (item.fileId && item.fileId.trim() !== '') {
      fileIds.push(item.fileId);
    }
  });

  const duplicates = fileIds.filter(
    (id, index) => fileIds.indexOf(id) !== index,
  );
  if (duplicates.includes(fileId)) {
    throw new Error(
      `Duplicate fileId found: ${fileId}. FileId must be unique within a row`,
    );
  }
};
