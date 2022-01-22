import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { fileUploadStore } from "../components/FileUploadDisplay";
import { axiosApiClient } from "../lib/data-fetch";

function readFileAsync(file: File): Promise<FileReader> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("abort", () => reject("File reading was aborted"));
    reader.addEventListener("error", () => reject("File reading has failed"));
    reader.addEventListener("load", (r) => {
      resolve(reader);
    });
    reader.readAsArrayBuffer(file);
  });
}

let currentUploadSlots = [];
const waitingsList: (() => Promise<any>)[] = [];
window.onbeforeunload = () => {
  if (currentUploadSlots.length > 0 || waitingsList.length > 0)
    return "Files are uploading";
};

function appendToList(a?: () => any, end?: () => any) {
  if (a) {
    waitingsList.push(a);
  }
  if (currentUploadSlots.length < 4 && waitingsList.length > 0) {
    const promise = waitingsList.shift()();
    currentUploadSlots.push(promise);
    promise.then(() => {
      currentUploadSlots = currentUploadSlots.filter((x) => x !== promise);
      appendToList(null);
    });
  }
  if (waitingsList.length === 0 && end) {
    end();
  }
}

function dropZone({
  bucketId,
  currentPath,
}: {
  bucketId: string;
  currentPath: string;
}) {
  const addFile = fileUploadStore((state) => state.addFile);
  const updateFile = fileUploadStore((state) => state.updateFile);
  const removeFile = fileUploadStore((state) => state.removeFile);
  const setUpdating = fileUploadStore((state) => state.setUpdating);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length < 1) return;
      setUpdating(true);
      for (const file of acceptedFiles) {
        let bId = bucketId;

        let path = (file as any).path;
        if (path[0] === "/") {
          path = path.substring(1);
        }
        if (currentPath) {
          path = currentPath + "/" + path;
        }
        let f = {
          bucketId: bId,
          path,
          size: file.size,
          uploaded: 0,
        };
        addFile(f);

        appendToList(async () => {
          const formData = new FormData();
          formData.append(
            "data",
            JSON.stringify({
              path,
              size: file.size,
              contentType: file.type,
            })
          );
          formData.append("file", file);

          axiosApiClient
            .put(`/buckets/${bId}`, formData, {
              headers: { "Content-Type": "multipart/form-data" },
              onUploadProgress: (up) => {
                f.uploaded = up.loaded;
                updateFile(f);
              },
            })
            .catch(console.error)
            .then(() => removeFile(f));
        });
      }
      setUpdating(false);
    },

    [bucketId, currentPath]
  );

  const zone = useDropzone({ onDrop, noClick: true });

  return zone;
}

export default dropZone;
