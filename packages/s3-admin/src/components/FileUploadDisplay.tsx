import { Box, Progress } from "@chakra-ui/react";
import { stat } from "fs";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { createStore } from "../lib/store";

export interface UploadFile {
  path: string;
  bucketId: string;
  uploaded: number;
  size: number;
  cancel?: () => void;
}

function sum<T = any>(array: T[], format: (T) => number) {
  return array.reduce((v, x) => format(x) + v, 0);
}

function updateSum(state: any) {
  state.uploadedSum = sum(state.files, (f) => f.uploaded);
  state.totalSum = sum(state.files, (f) => f.size);
}

export const fileUploadStore = createStore<{
  files: UploadFile[];
  isUpdating: boolean;
  setUpdating: (b: boolean) => void;
  addFile: (file: UploadFile) => void;
  updateFile: (file: UploadFile) => void;
  removeFile: (d: { bucketId: string; path: string }) => void;
  uploadedSum: number;
  totalSum: number;
}>((set) => ({
  files: [],
  isUpdating: false,
  uploadedSum: 0,
  totalSum: 0,
  setUpdating: (u: boolean) =>
    set((state) => {
      state.isUpdating = u;
      return state;
    }),
  addFile: (file: UploadFile) => {
    set((state) => {
      state.files.push(file);
      updateSum(state);
      return Object.assign({}, state);
    });
  },
  updateFile: (file: UploadFile) => {
    set((state) => {
      for (let i = 0; i < state.files.length; i++) {
        const f = state.files[i];
        if (f.path === file.path && f.bucketId === file.bucketId) {
          state.files[i] = file;
          break;
        }
      }
      updateSum(state);

      return Object.assign({}, state);
    });
  },
  removeFile: ({ bucketId, path }) => {
    set((state) => {
      state.files = state.files.filter(
        (x) => x.path !== path && x.bucketId !== bucketId
      );
      updateSum(state);

      return Object.assign({}, state);
    });
  },
}));

const FileUploadDisplay: FC<{}> = () => {
  const { files, totalSum, isUpdating, uploadedSum } = fileUploadStore();
  return (
    <Box width="500px" height="20px">
      {(totalSum > 0 || isUpdating) && (
        <Progress
          isIndeterminate={isUpdating}
          value={(uploadedSum / totalSum) * 100 || 0}
        />
      )}
    </Box>
  );
};

export default FileUploadDisplay;
