import {
  Box,
  Button,
  Flex,
  HStack,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { GetServerSideProps } from "next";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { FC, useState } from "react";
import { useRouter } from "next/router";
import SideBar from "../../../../components/SideBar";
import { useFetchQuery } from "../../../../lib/data-fetch";
import { BucketObject } from "../../../../lib/data";
import prettyBytes from "pretty-bytes";
import useFileDownloader from "../../../../hooks/download";

const page: FC<{ id: string; fileId: string }> = ({ id, fileId }) => {
  const { t } = useTranslation("buckets");
  const { t: common } = useTranslation("common");
  const [src, setSrc] = useState(null);

  const { isLoading, isError, data } = useFetchQuery<BucketObject>(
    `buckets/${id}/${fileId}`
  );

  const { isDownloading, directDownload, stream } = useFileDownloader(
    id,
    fileId,
    data?.path
  );

  return (
    <SideBar>
      <Box mx="10" my="2" height="100%">
        {isLoading && <Spinner />}
        {isError && <Text color="red.500">{common("error")}</Text>}
        {data && (
          <VStack alignItems="start">
            <HStack alignItems="baseline">
              <Text fontSize="2xl">{data.path.split("/").pop()}</Text>
              <Text fontSize="md">{prettyBytes(data.size)}</Text>
            </HStack>
            <HStack>
              <Button onClick={directDownload}>
                {isDownloading ? <Spinner /> : t("dowload")}
              </Button>
              <Button
                onClick={async () => {
                  const token = await stream();
                  setSrc(
                    `${process.env.NEXT_PUBLIC_API_BACKEND}/api/buckets/${id}/${fileId}/stream?token=${token}`
                  );
                }}
              >
                Stream
              </Button>
            </HStack>
            {src && (
              <video controls width="320" height="240">
                <source src={src} type="video/mp4" />
              </video>
            )}
          </VStack>
        )}
      </Box>
    </SideBar>
  );
};

export const getServerSideProps: GetServerSideProps = async ({
  locale,
  params,
}) => {
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common", "buckets"])),
      id: params.id,
      fileId: params.fileId,
    },
  };
};

export default page;
