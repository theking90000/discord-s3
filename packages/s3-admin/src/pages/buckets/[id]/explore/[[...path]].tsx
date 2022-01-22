import { Box, Button, HStack, Spinner, Text, VStack } from "@chakra-ui/react";
import { GetServerSideProps } from "next";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Link from "next/link";
import { FC, useEffect, useState } from "react";
import SideBar from "../../../../components/SideBar";
import { BucketObject } from "../../../../lib/data";
import { FaFolder, FaFile } from "react-icons/fa";
import { useFetchQuery } from "../../../../lib/data-fetch";
import prettyBytes from "pretty-bytes";
import dropZone from "../../../../hooks/DropZone";

const page: FC<{ id: string; path: string[] }> = ({ id, path }) => {
  const { t: common } = useTranslation("common");
  const { isLoading, isError, data } = useFetchQuery<BucketObject[]>(
    `buckets/${id}/find/${path?.join("/") ?? ""}`
  );

  const { getRootProps, getInputProps } = dropZone({
    bucketId: id,
    currentPath: path?.join("/") ?? "",
  });

  return (
    <SideBar>
      <Box {...getRootProps()} mx="10" my="2" height="100%" minHeight="250px">
        <input {...getInputProps()} />
        {isLoading && <Spinner />}
        {isError && <Text color="red.500">{common("error")}</Text>}
        {data && (
          <VStack>
            {data
              .reduce((acc, item) => {
                console.log("item", item.path);
                const p = item.path.split("/")[path?.length || 0];
                const sameDirItem = acc.find(
                  (i) => i.path.split("/")[path?.length || 0] === p
                );
                if (!sameDirItem) {
                  acc.push(item);
                } else {
                  sameDirItem.size += item.size;
                }
                return acc;
              }, [])
              .map((object) => (
                <DisplayInfo
                  bucketId={id}
                  currentPath={path || []}
                  key={object._id}
                  {...object}
                  isFolder={
                    object.path.split("/").length -
                      (path && path[0] !== "" ? 1 : 0) !==
                    (path?.length || 1)
                  }
                />
              ))}
          </VStack>
        )}
      </Box>
    </SideBar>
  );
};

const DisplayInfo: FC<
  BucketObject & { currentPath: string[]; bucketId: string; isFolder?: boolean }
> = ({ path, currentPath, bucketId, _id, isFolder, size }) => {
  const [href, setHref] = useState({});
  const { t } = useTranslation("buckets");
  useEffect(() => {
    setHref({
      pathname: isFolder
        ? "/buckets/[id]/explore/[[...path]]"
        : "/buckets/[id]/file/[file_id]",
      query: isFolder
        ? {
            path: path.split("/").filter((path, i) => i <= currentPath.length),
            id: bucketId,
          }
        : {
            id: bucketId,
            file_id: _id,
          },
    });
  }, [path, _id, bucketId, isFolder]);

  return (
    <Link href={href}>
      <Box width="100%">
        <HStack justifyContent="space-between">
          <HStack>
            {isFolder ? <FaFolder /> : <FaFile />}
            <Text
              fontSize="xl"
              _hover={{ textDecoration: "underline" }}
              cursor="pointer"
            >
              {path.split("/")[currentPath.length]}
            </Text>
          </HStack>
          <HStack>
            <Text>
              {t("file_size", {
                replace: {
                  size: prettyBytes(size),
                },
              })}
            </Text>
          </HStack>
        </HStack>
      </Box>
    </Link>
  );
};

export const getServerSideProps: GetServerSideProps = async ({
  locale,
  params,
}) => {
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common", "buckets"])),
      ...params,
    },
  };
};

export default page;
