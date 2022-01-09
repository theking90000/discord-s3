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
import { FC } from "react";
import { useRouter } from "next/router";
import SideBar from "../../../../components/SideBar";
import { useFetchQuery } from "../../../../lib/data-fetch";
import { BucketObject } from "../../../../lib/data";
import prettyBytes from "pretty-bytes";
import useFileDownloader from "../../../../hooks/download";

const page: FC<{ id: string; fileId: string }> = ({ id, fileId }) => {
  const { t } = useTranslation("buckets");
  const { t: common } = useTranslation("common");

  const { download, directDownload } = useFileDownloader(id, fileId);

  const { isLoading, isError, data } = useFetchQuery<BucketObject>(
    `buckets/${id}/${fileId}`
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
              <Button onClick={directDownload}>Download</Button>
            </HStack>
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
