import axios from "axios";
import { useState } from "react";
import { ObjectPart } from "../lib/data";
import { axiosApiClient } from "../lib/data-fetch";

async function decryptPart(data: Buffer, encryptionKey: string, iv: string) {
  let enc = new TextEncoder();
  let key = await window.crypto.subtle.digest(
    { name: "SHA-256" },
    enc.encode(encryptionKey)
  );
  let aesKey = await window.crypto.subtle.importKey(
    "raw",
    key,
    "AES-CBC",
    true,
    ["decrypt"]
  );
  try {
    enc = new TextEncoder();
    let decrypted = await window.crypto.subtle.decrypt(
      {
        name: "AES-CBC",
        iv: enc.encode(iv),
      },
      aesKey,
      data
    );
    return decrypted;
  } catch (e) {
    console.error(e);
  }
}

async function donwloadData(url: string): Promise<Buffer> {
  return fetch(url, {}).then((response) =>
    response.arrayBuffer().then((arrayBuffer) => {
      let buffer = Buffer.alloc(arrayBuffer.byteLength);
      let view = new Uint8Array(arrayBuffer);
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = view[i];
      }
      return buffer;
    })
  );
}

const waitingList = [];
let currentDl = [];

function appendToList(fn?: () => any, end?: () => any) {
  if (fn) {
    waitingList.push(fn);
  }
  if (currentDl.length < 4 && waitingList.length > 0) {
    const promise = waitingList.shift()();
    currentDl.push(promise);
    promise.then(() => {
      currentDl = currentDl.filter((x) => x !== promise);
      appendToList(null);
    });
  }
  if (waitingList.length === 0 && end) {
    end();
  }
}

const useFileDownloader = (bucketId: string, fileId: string) => {
  return {
    directDownload: async () => {
      try {
        const res = await axiosApiClient({
          url: `/buckets/${bucketId}/${fileId}/download`,
          responseType: "blob",
          onDownloadProgress: (e) => {
            console.log(e);
          },
        });
        let url = URL.createObjectURL(new Blob([res.data]));
        let a = document.createElement("a");
        a.href = url;
        a.download = fileId.split("/").pop();
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (e) {
        console.error(e);
      }
    },
    download: async () => {
      const parts = await axiosApiClient.get<ObjectPart[]>(
        `/buckets/${bucketId}/${fileId}/parts`
      );

      for (const part of parts.data) {
        appendToList(async () => {
          if (
            (part.encryptionKey && window?.crypto?.subtle) ||
            !part.encryptionKey
          ) {
            let data = await donwloadData(
              part.downloadUrl.replaceAll(
                "https://cdn.discordapp.com",
                `${process.env.NEXT_PUBLIC_API_BACKEND}/discord_cdn`
              )
            ); // due to cors request must be proxied
            if (part.encryptionKey && part.iv) {
              data = await decryptPart(data, part.encryptionKey, part.iv);
              console.log(data);
            }
          }
        });
      }
    },
  };
};

export default useFileDownloader;
